import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) test('etiquetas, descrições, filtros e edição em '+width, async ({page}, testInfo) => {
  await page.setViewportSize({width,height:844});
  const json=(body:unknown,status=200)=>({status,contentType:"application/json",body:JSON.stringify(body)});
  let tags=[{id:"sales",organizationId:"org",name:"Vendas"},{id:"finance",organizationId:"org",name:"Financeiro"}, ...Array.from({length:24},(_,index)=>({id:'tag-'+index,organizationId:'org',name:'Etiqueta de departamento '+(index+1)}))];
  const description="Total vendido, quantidade de vendas e ticket médio nos últimos 12 meses, incluindo o mês atual parcial. ".repeat(8);
  let report={id:"report",title:"Comparativo mensal",description,tags:tags.slice(0,2),organizationId:"org",organizationName:"Fábrica Sistemas",visibilityScope:"private",myRole:"root",canExecute:true,canEdit:true,executionBlockCode:null,blockedSchemas:[],allowedFilters:[{field:"status",type:"select",options:["paid"]}],content:{version:1,parameters:[{name:"start",type:"datetime",source:"system",variable:"startOfLast12Months",allowOverride:false}],dataset:{dataSourceId:"source",schemaId:"schema",select:[{fieldId:"total",alias:"Total"}]}}};
  const me={id:"user",name:"Root",email:"root@example.com",globalRole:"root",profileIds:[],organizations:[{id:"org",name:"Fábrica Sistemas",organizationRole:"administrator"}]};
  const session={accessToken:"token",refreshToken:"refresh",tokenType:"Bearer",expiresAt:new Date(Date.now()+3600000).toISOString(),userId:"user",email:me.email,globalRole:"root"};
  let saved=false;
  await page.route("**/api/v1/**",async route=>{
    const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
    if(path.endsWith('/auth/refresh'))return route.fulfill(json(session));
    if(path.endsWith('/me'))return route.fulfill(json(me));
    if(path.endsWith('/organizations/org'))return route.fulfill(json({id:"org",name:"Fábrica Sistemas",myRole:"root"}));
    if(path.endsWith('/reports/tags')) return route.fulfill(json([...tags,{id:'other-sales',organizationId:'other',organizationName:'Outra empresa',name:'Vendas'}]));
    if(path.endsWith('/report-tags')) {
      if(method==='POST'){const {name}=route.request().postDataJSON();tags=[...tags,{id:'new',organizationId:'org',name}];return route.fulfill(json(tags.at(-1),201));}
      return route.fulfill(json(tags));
    }
    if(path.includes('/report-tags/')){const id=path.split('/').at(-1)!;if(method==='DELETE'){tags=tags.filter(tag=>tag.id!==id);report={...report,tags:report.tags.filter(tag=>tag.id!==id)};return route.fulfill({status:204});}const {name}=route.request().postDataJSON();tags=tags.map(tag=>tag.id===id?{...tag,name}:tag);return route.fulfill(json(tags.find(tag=>tag.id===id)));}
    if(path.endsWith('/reports'))return route.fulfill(json({page:Number(url.searchParams.get('page')||1),pageSize:20,totalRecords:1,totalPages:1,data:[report]}));
    if(path.endsWith('/dashboards'))return route.fulfill(json({page:1,pageSize:20,totalRecords:0,totalPages:0,data:[]}));
    if(path.endsWith('/reports/report')){if(method==='PATCH'){const body=route.request().postDataJSON();expect(body.availableFilters).toEqual(report.allowedFilters);expect(body.tagIds).toEqual(['sales','finance']);report={...report,...body};saved=true;}return route.fulfill(json(report));}
    if(path.endsWith('/data-sources'))return route.fulfill(json([{id:'source',name:'Base local',provider:'postgresql',readOnlyVerificationStatus:'verified'}]));
    if(path.endsWith('/catalog'))return route.fulfill(json({schemas:[{id:'schema',dataSourceId:'source',name:'Pedidos',fields:[{id:'total',name:'Total',type:'number',selectable:true,filterable:true,sortable:true,groupable:false,aggregatable:true,allowedOperators:['eq'],allowedAggregations:['sum']}]}],joins:[]}));
    return route.fulfill(json({page:1,pageSize:20,totalRecords:0,totalPages:0,data:[]}));
  });
  await page.addInitScript(()=>localStorage.setItem('report-builder.session.v1',JSON.stringify({refreshToken:'refresh'})));
  await page.goto('/organizations/org/creator');
  await expect(page.getByText('Comparativo mensal',{exact:true})).toBeVisible();
  await expect(page.locator('.report-browser-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Gerenciar etiquetas'}).click();
  const manager=page.getByRole('dialog',{name:'Gerenciar etiquetas',exact:true});
  await manager.getByLabel('Nova etiqueta').fill('Compras e conciliações de fornecedores com nome longo');
  await manager.getByRole('button',{name:'Salvar etiqueta',exact:true}).click();
  await expect(manager.getByText('Etiqueta salva.')).toBeVisible();
  await expect(manager.getByRole('button',{name:'Fechar',exact:true})).toBeInViewport();
  await page.screenshot({path:testInfo.outputPath('gerenciar-etiquetas.png'),fullPage:true});
  await manager.getByRole('button',{name:'Renomear Vendas',exact:true}).click();
  await expect(manager.getByRole('textbox',{name:'Renomear etiqueta',exact:true})).toBeFocused();
  await manager.getByRole('button',{name:'Cancelar edição',exact:true}).click();
  await expect(manager.getByLabel('Nova etiqueta')).toHaveValue('');
  await manager.press('Escape');
  await expect(page.getByRole('button',{name:'Gerenciar etiquetas'})).toBeFocused();
  await page.getByRole('button',{name:'Filtrar por etiquetas (0)',exact:true}).click();
  await page.getByRole('button',{name:'Abrir opções de etiquetas',exact:true}).click();
  await page.getByRole('checkbox',{name:'Vendas',exact:true}).focus();
  await page.getByRole('checkbox',{name:'Vendas',exact:true}).press('Space');
  await expect(page.getByRole('checkbox',{name:'Vendas',exact:true})).toBeChecked();
  await page.getByRole('checkbox',{name:'Financeiro',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Financeiro',exact:true})).toBeChecked();
  await expect(page).toHaveURL(/tagIds=sales.*tagIds=finance/);
  await expect(page.locator('.report-browser-row')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('lista-etiquetas.png'),fullPage:true});
  await page.getByRole('link',{name:'Editar relatório Comparativo mensal'}).click();
  await page.getByRole('button',{name:'Próximo: Escolher Colunas'}).click();
  await page.getByRole('button',{name:'Próximo: Filtros & Ordenação'}).click();
  await page.getByRole('button',{name:'Próximo: Preview'}).click();
  await page.getByRole('button',{name:'Salvar Relatório',exact:true}).click();
  const save=page.getByRole('dialog',{name:'Salvar relatório',exact:true});
  await expect(save.getByRole('button',{name:'Remover etiqueta Vendas',exact:true})).toBeVisible();
  await save.getByRole('button',{name:'Abrir opções de etiquetas',exact:true}).click();
  await expect(save.getByRole('checkbox',{name:'Vendas',exact:true})).toBeChecked();
  await expect(save.getByRole('button',{name:'Confirmar e Salvar'})).toBeInViewport();
  await page.screenshot({path:testInfo.outputPath('salvar-relatorio.png'),fullPage:true});
  await save.getByLabel('Descrição (opcional)').fill('Resumo mensal atualizado.');
  await save.getByLabel('Nome do Relatório').fill('Comparativo');
  await save.getByRole('button',{name:'Confirmar e Salvar'}).click();
  await expect.poll(()=>saved).toBeTruthy();
  await page.goto('/dashboard');
  await page.getByRole('button',{name:'Filtrar por etiquetas (0)',exact:true}).click();
  await page.getByRole('button',{name:'Abrir opções de etiquetas',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Vendas · Fábrica Sistemas',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Buscar etiquetas'}).fill('Outra empresa');
  await page.getByRole('checkbox',{name:'Vendas · Outra empresa',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Vendas · Outra empresa',exact:true})).toBeChecked();
  await expect(page.getByRole('button',{name:'Remover etiqueta Vendas · Outra empresa',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/tagIds=other-sales/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('painel-etiquetas-empresas.png'),fullPage:true});
});
