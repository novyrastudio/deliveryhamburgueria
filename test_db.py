import json, uuid, sys, psycopg2
conn = psycopg2.connect(host="127.0.0.1", user="postgres", password="pw", dbname="fz")
cur = conn.cursor()
results = []

def setup():
    for n,(email,name) in {"A":("a@x.com","Ana"),"B":("b@x.com","Bia"),"ADM":("adm@x.com","Admin")}.items():
        cur.execute("insert into auth.users(email, raw_user_meta_data) values (%s, %s) returning id",
                    (email, json.dumps({"name":name,"phone":"11988887777","consent":"true"})))
        globals()["U"+n] = str(cur.fetchone()[0])
    cur.execute("update public.profiles set role='admin' where id=%s", (UADM,))
    conn.commit()

def role(r, sub=None, anon=False, ip=None):
    cur.execute("reset role")
    claims = {"role": r if r!="postgres" else "service"}
    if sub: claims["sub"] = sub
    if anon: claims["is_anonymous"] = "true"
    cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
    cur.execute("select set_config('request.headers', %s, true)", (json.dumps({"cf-connecting-ip": ip} if ip else {}),))
    if r in ("anon","authenticated"): cur.execute(f"set local role {r}")

def run(sql, params=None):
    cur.execute("savepoint s")
    try:
        cur.execute(sql, params)
        try: rows = cur.fetchall()
        except psycopg2.ProgrammingError: rows = []
        cur.execute("release savepoint s"); return ("ok", rows)
    except Exception as e:
        cur.execute("rollback to savepoint s"); return ("err", str(e).strip().split("\n")[0])

def payload(phone="11999990001", mode="delivery", slug="brasa-bacon", qty=1, method="Pix", coupon=None, doneness="ao-ponto", name="Cliente Teste"):
    p = {"customer":{"name":name,"phone":phone},"fulfillment":{"mode":mode,"district":"Centro","address":"Rua das Brasas, 147"},
         "payment":{"method":method},"items":[{"productSlug":slug,"qty":qty,"doneness":doneness}],"coupon":coupon,
         "totals":{"totalCents":1}}
    return json.dumps(p)

def order(**kw): return run("select public.create_order(%s::jsonb)", (payload(**kw),))

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail)); print(("PASS " if cond else "FAIL ")+name+("" if cond else "  -> "+str(detail)))

TESTS=[]
def test(fn):
    TESTS.append(fn); return fn

def has(res, text): return res[0]=="err" and text in res[1]

@test
def anon_nao_le_dados_privados():
    role("anon")
    for t in ["orders","coupons","profiles","admin_audit","account_deletions"]:
        r = run(f"select count(*) from public.{t}")
        check(f"anon nao le {t}", r[0]=="err" or r[1][0][0]==0, r)
    for t in ["security_config","order_attempts"]:
        check(f"anon sem acesso a {t}", run(f"select * from public.{t}")[0]=="err")

@test
def permissoes_de_funcoes():
    """Patch 06: funções administrativas não podem ser executadas por anon (padrão do Supabase as abre)."""
    role("postgres")
    def priv(who, fn):
        cur.execute("select has_function_privilege(%s, %s::regprocedure, 'execute')", (who, "public." + fn)); return cur.fetchone()[0]
    for fn in ["admin_set_role(text,text)", "delete_my_account()", "admin_anonymize_orders_by_phone(text)", "update_order_status(uuid,text,text)", "request_ip_hash()"]:
        check(f"anon SEM EXECUTE em {fn}", priv("anon", fn) is False)
    for fn in ["admin_set_role(text,text)", "delete_my_account()", "admin_anonymize_orders_by_phone(text)", "update_order_status(uuid,text,text)"]:
        check(f"authenticated COM EXECUTE em {fn}", priv("authenticated", fn) is True)
    check("authenticated SEM EXECUTE em request_ip_hash()", priv("authenticated", "request_ip_hash()") is False)
    for fn in ["create_order(jsonb)", "validate_coupon(text,integer)", "get_public_store_settings()", "request_ip_status()", "is_store_open_now()"]:
        check(f"anon COM EXECUTE em {fn} (site publico precisa)", priv("anon", fn) is True)
    role("anon")
    check("anon chamando admin_set_role: permissao negada", has(run("select public.admin_set_role('b@x.com','admin')"), "permission denied"))
    check("anon chamando update_order_status: permissao negada", has(run("select public.update_order_status(%s,'confirmed')", (str(uuid.uuid4()),)), "permission denied"))

@test
def anon_le_catalogo():
    role("anon")
    check("anon le 24 produtos", run("select count(*) from public.products")[1][0][0]==24)
    check("anon le 3 areas", run("select count(*) from public.delivery_areas")[1][0][0]==3)
    r = run("select public.validate_coupon('BRASA15', 10000)")
    check("validate_coupon BRASA15 valido", r[0]=="ok" and r[1][0][0]["valid"] is True, r)
    r = run("update public.products set price_cents=1 returning id")
    check("anon nao altera produtos (0 linhas ou erro)", r[0]=="err" or r[1]==[], r)

@test
def configuracoes_publicas():
    role("anon")
    r = run("select public.get_public_store_settings()")
    s = r[1][0][0]
    check("config publica tem 7 horarios", len(s["hours"])==7, s)
    check("config publica nao expoe cnpj/email", "cnpj" not in s and "email" not in s)
    check("config publica traz pagamentos", s["payments"]=={"pix":True,"card":True,"cash":True}, s["payments"])

@test
def escalada_de_privilegio():
    role("authenticated", UA)
    check("cliente nao muda proprio role", run("update public.profiles set role='admin' where id=%s",(UA,))[0]=="err")
    r = run("update public.profiles set name='Ana Maria' where id=%s returning name",(UA,))
    check("cliente edita proprio nome", r[0]=="ok" and r[1][0][0]=="Ana Maria", r)
    r = run("update public.profiles set name='Hack' where id=%s returning name",(UB,))
    check("cliente nao edita perfil de outro", r[0]=="err" or r[1]==[], r)
    check("cliente nao chama admin_set_role", has(run("select public.admin_set_role('b@x.com','admin')"),"acesso negado"))
    check("cliente nao insere pedido direto", run("insert into public.orders(customer_snapshot,items,fulfillment,payment,totals) values ('{}','[]','{}','{}','{}')")[0]=="err")
    check("cliente nao le auditoria", run("select count(*) from public.admin_audit")[1][0][0]==0)
    check("cliente nao lê order_attempts", run("select * from public.order_attempts")[0]=="err")
    check("cliente nao altera horarios", run("update public.business_hours set closed=true returning day")[1]==[])
    check("cliente nao altera loja", run("update public.store_settings set open=false returning id")[1]==[])
    check("cliente nao anonimiza pedidos", has(run("select public.admin_anonymize_orders_by_phone('11999990001')"),"acesso negado"))

@test
def pedidos_entrega_retirada_e_total():
    role("anon")
    r = order(phone="11999990001")
    check("convidado: pedido de entrega OK", r[0]=="ok", r)
    if r[0]=="ok":
        t = r[1][0][0]["totals"]
        check("total calculado no servidor (3890+690)", t["totalCents"]==4580 and t["subtotalCents"]==3890, t)
    r = order(phone="11999990002", mode="pickup")
    check("convidado: pedido de RETIRADA OK", r[0]=="ok", r)
    if r[0]=="ok": check("retirada sem taxa", r[1][0][0]["totals"]["deliveryFeeCents"]==0)
    r = order(phone="11999990003", coupon="BRASA15")
    check("cupom BRASA15 aplica 15% (584) -> 3996", r[0]=="ok" and r[1][0][0]["totals"]["totalCents"]==3996, r)
    check("cupom invalido recusado", has(order(phone="11999990004", coupon="NAOEXISTE"),"cupom invalido"))
    check("ponto da carne obrigatorio", has(order(phone="11999990005", doneness=""),"ponto da carne obrigatorio"))
    check("produto inexistente recusado", has(order(phone="11999990006", slug="nao-existe"),"produto indisponivel"))
    check("abaixo do minimo recusado", has(order(phone="11999990007", slug="refrigerante-lata"),"pedido abaixo do minimo"))
    check("retirada abaixo do minimo da loja recusada", has(order(phone="11999990008", slug="refrigerante-lata", mode="pickup"),"pedido abaixo do minimo"))
    check("pagamento invalido recusado", has(order(phone="11999990009", method="Bitcoin"),"pagamento invalido"))
    check("quantidade absurda recusada", has(order(phone="11999990010", qty=99),"quantidade invalida"))
    role("postgres"); cur.execute("select used_count from public.coupons where code='BRASA15'"); check("used_count do cupom incrementou", cur.fetchone()[0]==1)

@test
def pedido_logado_e_isolamento():
    role("authenticated", UA); ra = order()
    role("authenticated", UB); rb = order()
    check("pedidos logados OK", ra[0]=="ok" and rb[0]=="ok", (ra,rb))
    role("authenticated", UA)
    check("cliente A ve so o proprio pedido", run("select count(*) from public.orders")[1][0][0]==1)
    role("authenticated", UADM)
    check("admin ve todos os pedidos", run("select count(*) from public.orders")[1][0][0]==2)
    role("authenticated", UA)
    check("cliente A nao muda status", has(run("select public.update_order_status(%s,'confirmed')",(str(uuid.uuid4()),)),"acesso negado"))

@test
def status_transicoes():
    role("anon"); r = order(); oid = r[1][0][0]["orderNumber"]
    role("authenticated", UADM)
    cur.execute("select id from public.orders limit 1"); i = str(cur.fetchone()[0])
    check("new->done proibido", has(run("select public.update_order_status(%s,'done')",(i,)),"transicao"))
    check("new->confirmed OK", run("select (public.update_order_status(%s,'confirmed')).status",(i,))[1][0][0]=="confirmed")
    check("confirmed->prep OK", run("select (public.update_order_status(%s,'prep')).status",(i,))[1][0][0]=="prep")
    check("prep->rejected proibido", has(run("select public.update_order_status(%s,'rejected','x')",(i,)),"transicao"))

@test
def limite_telefone_convidado():
    role("anon")
    rs = [order(phone="11977770001")[0] for _ in range(4)]
    check("4o pedido do mesmo WhatsApp em 10 min barrado", rs==["ok","ok","ok","err"], rs)

@test
def limite_por_ip():
    role("anon", ip="203.0.113.7")
    rs = [order(phone=f"1197777{i:04d}")[0] for i in range(7)]
    check("IP: 5 passam, 6o e 7o barrados", rs==["ok"]*5+["err","err"], rs)
    role("anon", ip="203.0.113.8")
    check("outro IP nao e afetado", order(phone="11976660001")[0]=="ok")
    role("anon")
    rs = [order(phone=f"1196666{i:04d}")[0] for i in range(7)]
    check("SEM cabecalho de IP: limite por origem NAO se aplica (esperado)", rs==["ok"]*7, rs)
    role("anon", ip="203.0.113.7"); 
    check("IP status detecta cabecalho", run("select public.request_ip_status()")[1][0][0]=={"cfConnectingIpPresent":True})
    role("anon"); check("IP status sem cabecalho = false", run("select public.request_ip_status()")[1][0][0]=={"cfConnectingIpPresent":False})
    role("postgres"); cur.execute("select count(*) from public.order_attempts where ip_hash like '203%' or ip_hash='203.0.113.7'"); check("IP nunca e gravado em claro", cur.fetchone()[0]==0)

@test
def captcha_obrigatorio():
    role("postgres"); cur.execute("update public.store_settings set require_guest_captcha=true")
    role("anon"); check("sem sessao anonima: barrado", has(order(phone="11955550001"),"verificacao obrigatoria"))
    sub = str(uuid.uuid4())
    role("authenticated", sub, anon=True)
    rs = [order(phone=f"1195555{i:04d}")[0] for i in range(4)]
    check("sessao anonima: 3 passam, 4a barrada", rs==["ok","ok","ok","err"], rs)
    role("postgres"); cur.execute("select count(*) from public.orders where customer_id is null"); check("pedidos anonimos ficam sem conta (customer_id nulo)", cur.fetchone()[0]==3)
    role("authenticated", UA); check("usuario logado nao precisa de captcha", order()[0]=="ok")

@test
def limite_usuario_logado():
    role("authenticated", UA)
    rs = [order()[0] for _ in range(6)]
    check("conta: 5 pedidos / 10 min, 6o barrado", rs==["ok"]*5+["err"], rs)

@test
def horarios_e_pagamentos():
    role("postgres")
    cur.execute("update public.store_settings set enforce_hours=true"); cur.execute("update public.business_hours set closed=true")
    check("is_store_open_now falso com tudo fechado", run("select public.is_store_open_now()")[1][0][0] is False)
    role("anon"); check("enforce_hours: pedido barrado fora do horario", has(order(),"loja fechada"))
    role("postgres"); cur.execute("update public.business_hours set closed=false, open_time='00:00', close_time='23:59'")
    check("is_store_open_now verdadeiro com 00:00-23:59", run("select public.is_store_open_now()")[1][0][0] is True)
    role("anon"); check("enforce_hours: dentro do horario passa", order()[0]=="ok")
    role("postgres"); cur.execute("update public.store_settings set pay_pix=false"); role("anon")
    check("Pix desligado: pedido com Pix recusado", has(order(phone="11944440001"),"pagamento invalido"))
    check("Credito ainda aceito", order(phone="11944440002", method="Crédito")[0]=="ok")
    role("postgres"); cur.execute("update public.store_settings set open=false"); role("anon")
    check("loja pausada: pedido recusado", has(order(phone="11944440003", method="Crédito"),"loja fechada"))

@test
def admin_gerencia_configuracoes_e_papeis():
    role("authenticated", UADM)
    check("admin altera horarios", run("update public.business_hours set open_time='17:00' where day=2 returning day")[1]!=[])
    check("admin altera dados da loja", run("update public.store_settings set store_name='X', whatsapp='(11) 91234-5678' returning id")[1]!=[])
    check("horario invalido (fecha antes de abrir) recusado", run("update public.business_hours set close_time='10:00' where day=2")[0]=="err")
    check("tempo medio invalido recusado", run("update public.store_settings set avg_delivery_min=50, avg_delivery_max=40")[0]=="err")
    check("admin promove B por e-mail", run("select public.admin_set_role('b@x.com','admin')")[0]=="ok")
    check("admin le auditoria (1 registro)", run("select count(*) from public.admin_audit")[1][0][0]==1)
    check("admin nao remove o proprio acesso", has(run("select public.admin_set_role('adm@x.com','customer')"),"proprio acesso"))
    check("papel invalido recusado", has(run("select public.admin_set_role('b@x.com','root')"),"papel invalido"))
    check("conta inexistente recusada", has(run("select public.admin_set_role('zz@x.com','admin')"),"conta nao encontrada"))
    check("admin rebaixa B", run("select public.admin_set_role('b@x.com','customer')")[0]=="ok")

@test
def exclusao_de_conta_manter():
    role("authenticated", UA); order(); 
    r = run("select public.delete_my_account()")
    check("excluir conta funciona", r[0]=="ok" and r[1][0][0]=={"deleted":True,"ordersKept":1}, r)
    role("postgres")
    cur.execute("select count(*) from auth.users where id=%s",(UA,)); check("usuario removido do auth", cur.fetchone()[0]==0)
    cur.execute("select count(*) from public.profiles where id=%s",(UA,)); check("perfil removido", cur.fetchone()[0]==0)
    cur.execute("select customer_id, customer_snapshot->>'name' from public.orders"); row=cur.fetchone()
    check("politica 'keep': pedido mantido, sem conta, dados preservados", row==(None,"Ana Maria") or row==(None,"Ana"), row)
    cur.execute("select policy, orders_affected from public.account_deletions"); check("registro de exclusao sem dado pessoal", cur.fetchone()==("keep",1))

@test
def exclusao_de_conta_anonimizar():
    role("postgres"); cur.execute("update public.store_settings set deletion_order_policy='anonymize'")
    role("authenticated", UA); order(); run("select public.delete_my_account()")
    role("postgres"); cur.execute("select customer_snapshot, fulfillment from public.orders"); snap, ful = cur.fetchone()
    check("politica 'anonymize': nome/telefone apagados", snap["name"]=="Cliente excluído" and snap["phone"]=="" and snap["email"]=="", snap)
    check("politica 'anonymize': endereco removido, bairro mantido", "address" not in ful and ful.get("district")=="Centro", ful)
    cur.execute("select items from public.orders"); check("itens e valores mantidos", len(cur.fetchone()[0])==1)

@test
def exclusao_regras():
    role("authenticated", UADM); check("ultimo admin nao exclui a conta", has(run("select public.delete_my_account()"),"ultimo administrador"))
    role("anon"); check("anon nao exclui conta", run("select public.delete_my_account()")[0]=="err")
    role("authenticated", str(uuid.uuid4()), anon=True); check("sessao anonima nao exclui conta", has(run("select public.delete_my_account()"),"login obrigatorio"))

@test
def anonimizar_convidado():
    role("anon"); order(phone="11933330001"); order(phone="11933330002")
    role("authenticated", UADM)
    check("admin anonimiza pedidos do telefone (1)", run("select public.admin_anonymize_orders_by_phone('(11) 93333-0001')")[1][0][0]==1)
    check("telefone invalido recusado", has(run("select public.admin_anonymize_orders_by_phone('123')"),"whatsapp invalido"))

@test
def cadastro_e_anonimo():
    role("postgres")
    check("cadastro sem consentimento barrado", run("insert into auth.users(email, raw_user_meta_data) values ('c@x.com','{\"name\":\"Cris\",\"phone\":\"11988887777\"}')")[0]=="err")
    check("cadastro sem telefone barrado", run("insert into auth.users(email, raw_user_meta_data) values ('d@x.com','{\"name\":\"Dani\",\"consent\":\"true\"}')")[0]=="err")
    check("usuario anonimo (sem perfil) permitido", run("insert into auth.users(email, raw_user_meta_data, is_anonymous) values (null,'{}',true)")[0]=="ok")
    check("cadastro valido OK", run("insert into auth.users(email, raw_user_meta_data) values ('e@x.com','{\"name\":\"Edu\",\"phone\":\"11988887777\",\"consent\":\"true\"}')")[0]=="ok")

setup()
for fn in TESTS:
    try: fn()
    except Exception as e: check(fn.__name__, False, repr(e))
    conn.rollback()
p = sum(1 for r in results if r[1]); f = [r for r in results if not r[1]]
print(f"\nRESULTADO: {p} aprovados, {len(f)} falharam")
