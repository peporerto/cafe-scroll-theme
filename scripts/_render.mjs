// Renders the theme's Liquid WITHOUT Shopify, for local preview and tests.
// Pages: render('index') for the home, render('product') for the product page (with a demo product).
import { Liquid } from 'liquidjs';
import fs from 'node:fs'; import path from 'node:path';
const T = path.resolve('theme');
const engine = new Liquid({ root:[path.join(T,'snippets')], extname:'.liquid', jsTruthy:false, strictFilters:false, strictVariables:false });

// ---- translations: the real en.default.json, so the preview shows the real text ----
const locale = JSON.parse(fs.readFileSync(path.join(T,'locales/en.default.json'),'utf8'));
const translate = (key, args={}) => {
  let v = String(key).split('.').reduce((o,k)=>o?.[k], locale);
  if (typeof v !== 'string') return key;
  return v.replace(/{{\s*(\w+)\s*}}/g, (_,k)=> args[k] ?? '');
};

// ---- Shopify filters (just enough for the preview) ----
const kwargs = (args)=>{ const a={}; for(const x of args) if(Array.isArray(x)) a[x[0]]=x[1]; return a; };
const cents = (v)=> '$'+(Number(v)/100).toFixed(2);
engine.registerFilter('asset_url', v=>'/assets/'+v);
engine.registerFilter('stylesheet_tag', u=>`<link rel="stylesheet" href="${u}">`);
engine.registerFilter('t', function(k,...args){ return translate(k, kwargs(args)); });
engine.registerFilter('image_url', v=> (v && typeof v==='object') ? (v.src || v.preview_image?.src) : v);
engine.registerFilter('image_tag', (url,...args)=>{ const a=kwargs(args); return `<img src="${url}" class="${a.class||''}" loading="${a.loading||'lazy'}" ${a.fetchpriority&&a.fetchpriority!=='auto'?`fetchpriority="${a.fetchpriority}"`:''} alt="${a.alt||''}">`; });
engine.registerFilter('money', cents);
engine.registerFilter('money_without_currency', v=> (Number(v)/100).toFixed(2));
engine.registerFilter('unit_price_with_measurement', (v,m)=> `${cents(v)} / ${m?.reference_value||1}${m?.reference_unit||'g'}`);
engine.registerFilter('structured_data', (p)=> JSON.stringify({'@context':'http://schema.org/','@type':'Product',name:p?.title,description:p?.description,offers:(p?.variants||[]).map(v=>({'@type':'Offer',price:(v.price/100).toFixed(2),priceCurrency:'USD',availability:v.available?'http://schema.org/InStock':'http://schema.org/OutOfStock'}))}));
engine.registerFilter('payment_button', ()=>'<div class="shopify-payment-button"><button type="button" class="shopify-payment-button__button">Buy it now (demo)</button></div>');

// ---- {% form 'product', product, id: x, class: y %} ... {% endform %} ----
engine.registerTag('form', {
  parse(token, remainTokens){
    this.args = token.args; this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens)
      .on('tag:endform', ()=>stream.stop())
      .on('template', tpl=>this.tpls.push(tpl))
      .on('end', ()=>{ throw new Error('tag endform not closed'); });
    stream.start();
  },
  * render(ctx, emitter){
    const parts = this.args.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.trim());
    const attrs = {};
    for (const part of parts.slice(2)) {
      const m = part.match(/^([\w-]+)\s*:\s*(.+)$/); if (!m) continue;
      attrs[m[1]] = yield this.liquid.evalValue(m[2], ctx);
    }
    const attr = Object.entries(attrs).map(([k,v])=>`${k}="${v}"`).join(' ');
    emitter.write(`<form method="post" action="/cart/add" accept-charset="UTF-8" enctype="multipart/form-data" ${attr}><input type="hidden" name="form_type" value="product"><input type="hidden" name="utf8" value="✓">`);
    ctx.push({ form: { errors: null } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
});

const settingsSchema = JSON.parse(fs.readFileSync(path.join(T,'config/settings_schema.json'),'utf8'));
const gsettings={}; for(const g of settingsSchema) for(const s of g.settings||[]) if(s.id) gsettings[s.id]=s.default;
const D='preview-images'; const has=f=>fs.existsSync(path.join(D,f)) ? '/'+D+'/'+f : undefined;
const pick=(o)=>Object.fromEntries(Object.entries(o).filter(([,v])=>v));
const imgs = {
  'featured-catalog': pick({ image_wall: has('catalog-wall.jpg') }),
  hero: pick({ image_far: has('hero-far.jpg'), image_open: has('hero-open.jpg') }),
};
function defaults(arr){const o={};for(const s of arr||[]) if(s.id) o[s.id]=s.default; return o;}

// ---- demo product (only for the local preview; a real shop supplies its own) ----
function demoProduct(variantId){
  const sizes=['250 g','1 kg'], grinds=['Whole bean','Espresso','Filter'];
  const variants=[]; let id=4100;
  for(const s of sizes) for(const g of grinds){ id++; variants.push({ id, title:`${s} / ${g}`, options:[s,g], option1:s, option2:g, price: s==='250 g'?1800:5600, compare_at_price: s==='1 kg'?6400:null, available: !(s==='1 kg' && g==='Espresso'), sku:`YRG-${id}`, unit_price: s==='250 g'?720:560, unit_price_measurement:{reference_value:100,reference_unit:'g'}, featured_media:{ id: g==='Filter'?903:901 } }); }
  const media=[
    { id:901, media_type:'image', alt:'Roasted bean', src:'/assets/bean-spin-000.webp', width:560, height:560 },
    { id:902, media_type:'image', alt:'Bean cut open', src:'/assets/bean-cut.webp', width:616, height:561 },
    { id:903, media_type:'image', alt:'Open bag with beans', src: has('hero-open.jpg')||'/assets/bean-spin-010.webp', width:1672, height:941 },
    { id:904, media_type:'image', alt:'Bean, another side', src:'/assets/bean-spin-050.webp', width:560, height:560 },
  ];
  media.forEach(m=>m.preview_image={src:m.src});
  const current = variants.find(v=>v.id==variantId) || variants[0];
  return {
    id:1, title:'Ethiopia Yirgacheffe', handle:'ethiopia-yirgacheffe', url:'/products/ethiopia-yirgacheffe', vendor:'Altura', type:'Single origin',
    description:'<p>Floral and bright, grown at 1,900 m in the Gedeo zone. Washed process, dried on raised beds.</p><p>A clean cup with jasmine on the nose, bergamot in the middle and a raspberry finish.</p>',
    available:true, has_only_default_variant:false,
    options_with_values: [
      { name:'Size', position:1, values:sizes, selected_value: current.options[0] },
      { name:'Grind', position:2, values:grinds, selected_value: current.options[1] },
    ],
    variants, media, featured_media: media[0],
    selected_or_first_available_variant: current,
    selling_plan_groups:[{ name:'Subscribe and save', selling_plans:[
      { id:11, name:'Every 2 weeks', price_adjustments:[{ value_type:'percentage', value:10 }] },
      { id:12, name:'Every month', price_adjustments:[{ value_type:'percentage', value:7 }] } ] }],
    collections:[{ title:'Coffee', url:'/collections/coffee' }],
  };
}

async function renderSection(name,id,tpl,extra={}){
  const raw=fs.readFileSync(path.join(T,'sections',name+'.liquid'),'utf8');
  const m=raw.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema=JSON.parse(m[1]); const body=raw.replace(m[0],'');
  const settings={...defaults(schema.settings), ...(imgs[name]||{}), ...(tpl?.settings||{})};
  const bt=Object.fromEntries((schema.blocks||[]).map(b=>[b.type,b]));
  const blocks=[];
  if (tpl?.blocks) {
    for (const bid of tpl.block_order||Object.keys(tpl.blocks)) { const b=tpl.blocks[bid]; blocks.push({id:bid,type:b.type,settings:{...defaults(bt[b.type]?.settings),...(b.settings||{})},shopify_attributes:''}); }
  } else {
    const preset=(schema.presets||[])[0]||{};
    for(const b of preset.blocks||[]) blocks.push({type:b.type,settings:{...defaults(bt[b.type]?.settings),...(b.settings||{})},shopify_attributes:''});
    if(!blocks.length && schema.max_blocks!==0 && (schema.blocks||[]).length){ for(let i=0;i<4;i++){ const b=schema.blocks[0]; blocks.push({type:b.type,settings:defaults(b.settings),shopify_attributes:''}); } }
  }
  return engine.parseAndRender(body,{section:{id,settings,blocks},settings:gsettings,shop:SHOP,routes:ROUTES,linklists:{},request:REQUEST,collections:{},products:[],...extra});
}
const SHOP={name:'Altura',url:'https://altura.example',money_format:'${{amount}}'};
const ROUTES={root_url:'/'};
const REQUEST={locale:{iso_code:'en'},page_type:'index'};

export async function render(kind='index', opts={}){
  const tplName = kind==='product' ? 'product' : 'index';
  const tpl=JSON.parse(fs.readFileSync(path.join(T,`templates/${tplName}.json`),'utf8'));
  const extra = kind==='product' ? { product: demoProduct(opts.variant) } : {};
  const request = {...REQUEST, page_type: kind==='product'?'product':'index'};
  let main=''; for(const id of tpl.order){ main+=await renderSection(tpl.sections[id].type,id,tpl.sections[id],{...extra,request});}
  let layout=fs.readFileSync(path.join(T,'layout/theme.liquid'),'utf8');
  const header=await renderSection('header','header'), footer=await renderSection('footer','footer');
  layout=layout.replace(/{%\s*section 'header'\s*%}/,'__H__').replace(/{%\s*section 'footer'\s*%}/,'__F__').replace('{{ content_for_layout }}','__M__');
  let html=await engine.parseAndRender(layout,{settings:gsettings,shop:SHOP,request,...extra,page_title:kind==='product'?'Ethiopia Yirgacheffe – Altura':'Altura',canonical_url:'',content_for_header:''});
  html=html.replace('__H__',header).replace('__F__',footer).replace('__M__',main);
  return html;
}
