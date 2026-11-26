create or replace function public.create_delivery(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  customer_id uuid;
  loan_id uuid;
  delivery_date date;
  tenure int;
  emi_day int;
  n int;
  due_date date;
begin
  delivery_date := (payload->>'delivery_date')::date;
  insert into public.customers(name, phone, email, address, scooter_model, scooter_color, chassis_no, delivery_date, source)
  values (
    btrim(payload->>'name'), btrim(payload->>'phone'), nullif(btrim(payload->>'email'), ''),
    coalesce(payload->>'address', ''), btrim(payload->>'scooter_model'), coalesce(payload->>'scooter_color', ''),
    nullif(btrim(payload->>'chassis_no'), ''), delivery_date, 'walk-in'
  ) returning id into customer_id;

  insert into public.services(customer_id, type, km_trigger, month_trigger, km_last_known, status, due_date)
  values
    (customer_id, 'free_1', 500, 1, 0, 'upcoming', (delivery_date + interval '1 month')::date),
    (customer_id, 'free_2', 1000, 2, 0, 'upcoming', (delivery_date + interval '2 months')::date),
    (customer_id, 'free_3', 1500, 3, 0, 'upcoming', (delivery_date + interval '3 months')::date);

  insert into public.reminders(customer_id, type, due_date, status, occurrence_key)
  values
    (customer_id, 'review_ask', delivery_date + 5, 'pending', 'delivery-review'),
    (customer_id, 'feedback_call', delivery_date + 15, 'pending', 'delivery-feedback');

  if coalesce((payload->>'no_loan')::boolean, false) then
    return customer_id;
  end if;

  tenure := (payload->>'tenure_months')::int;
  emi_day := (payload->>'emi_day_of_month')::int;
  insert into public.loans(customer_id, company, principal_amount, tenure_months, emi_amount, emi_day_of_month, start_date, status)
  values (customer_id, btrim(payload->>'company'), (payload->>'principal_amount')::numeric, tenure,
    (payload->>'emi_amount')::numeric, emi_day, delivery_date, 'active') returning id into loan_id;

  for n in 0..tenure - 1 loop
    due_date := make_date(
      extract(year from (date_trunc('month', delivery_date::timestamp) + make_interval(months => n)))::int,
      extract(month from (date_trunc('month', delivery_date::timestamp) + make_interval(months => n)))::int,
      least(emi_day, extract(day from (date_trunc('month', delivery_date::timestamp) + make_interval(months => n + 1) - interval '1 day'))::int)
    );
    insert into public.emi_payments(loan_id, due_date, amount_due, amount_paid, status)
    values (loan_id, due_date, (payload->>'emi_amount')::numeric, 0, 'upcoming');
  end loop;
  return customer_id;
end;
$$;

revoke all on function public.create_delivery(jsonb) from public, anon;
grant execute on function public.create_delivery(jsonb) to authenticated;
