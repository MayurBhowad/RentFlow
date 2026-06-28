-- Fix recursive trigger that caused "stack depth limit exceeded" on bill insert.
-- Use a BEFORE row trigger to set overdue status on the current row only.

CREATE OR REPLACE FUNCTION check_overdue_bills()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('pending', 'partially_paid') AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_overdue ON monthly_bills;
CREATE TRIGGER trigger_check_overdue
  BEFORE INSERT OR UPDATE ON monthly_bills
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_bills();

-- Backfill any existing bills that should already be overdue
UPDATE monthly_bills
SET status = 'overdue', updated_at = now()
WHERE status IN ('pending', 'partially_paid') AND due_date < CURRENT_DATE;
