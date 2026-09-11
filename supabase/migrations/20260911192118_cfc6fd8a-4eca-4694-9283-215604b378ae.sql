CREATE OR REPLACE FUNCTION public.sanitize_fato_rendimentos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.nome_indicador := btrim(NEW.nome_indicador);
  NEW.rendimento := round(NEW.rendimento, 4);
  NEW.data_atualizacao := COALESCE(NEW.data_atualizacao, CURRENT_DATE);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;