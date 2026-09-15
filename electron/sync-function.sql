create or replace function sync_offline_calculation(
  input_a numeric,
  input_b numeric,
  input_c numeric,
  input_operation text,
  input_result numeric,
  input_created_at timestamptz
)
returns void as $$
begin
  insert into calculations (user_id, a, b, c, operation, result, created_at)
  values (auth.uid(), input_a, input_b, input_c, input_operation, input_result, input_created_at);
end;
$$ language plpgsql security definer set search_path = public;
