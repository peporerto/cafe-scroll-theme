// Renders the theme's Liquid WITHOUT Shopify, for local preview and tests.
// Pages: render('index'), render('product') (demo product) and render('cart') (in-memory demo cart, see cartApi) and render('collection') (9 demo products with filters, sorting and pagination).
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
engine.registerFilter('preload_tag', (u,...args)=>{ const a=kwargs(args); return `<link rel="preload" href="${u}" as="${a.as||'style'}"${a.type?` type="${a.type}"`:''}${a.as==='font'?' crossorigin':''}>`; });
engine.registerFilter('t', function(k,...args){ return translate(k, kwargs(args)); });
engine.registerFilter('image_url', v=> (v && typeof v==='object') ? (v.src || v.preview_image?.src) : v);
engine.registerFilter('image_tag', (url,...args)=>{ const a=kwargs(args); return `<img src="${url}" class="${a.class||''}" loading="${a.loading||'lazy'}" ${a.fetchpriority&&a.fetchpriority!=='auto'?`fetchpriority="${a.fetchpriority}"`:''} alt="${a.alt||''}">`; });
engine.registerFilter('handleize', v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
engine.registerFilter('format_code', v=>String(v).replace(/(.{4})(?=.)/g,'$1 ').toUpperCase());
engine.registerFilter('payment_type_svg_tag', (t,...args)=>{ const a=kwargs(args); return `<svg class="${a.class||''}" viewBox="0 0 38 24" role="img" aria-label="${t}"><rect width="38" height="24" rx="3" fill="#fff"/><text x="19" y="15" font-size="6" text-anchor="middle" fill="#222">${t}</text></svg>`; });
engine.registerFilter('money', cents);
engine.registerFilter('money_without_currency', v=> (Number(v)/100).toFixed(2));
engine.registerFilter('unit_price_with_measurement', (v,m)=> `${cents(v)} / ${m?.reference_value||1}${m?.reference_unit||'g'}`);
engine.registerFilter('structured_data', (p)=> p?.object_type==='article' ? JSON.stringify({'@context':'http://schema.org/','@type':'Article',headline:p.title,datePublished:p.published_at,author:{'@type':'Person',name:p.author}}) : (PRODUCT_SD)(p));
const PRODUCT_SD = (p)=> JSON.stringify({'@context':'http://schema.org/','@type':'Product',name:p?.title,description:p?.description,offers:(p?.variants||[]).map(v=>({'@type':'Offer',price:(v.price/100).toFixed(2),priceCurrency:'USD',availability:v.available?'http://schema.org/InStock':'http://schema.org/OutOfStock'}))});
engine.registerFilter('payment_button', ()=>'<div class="shopify-payment-button"><button type="button" class="shopify-payment-button__button">Buy it now (demo)</button></div>');

engine.registerTag('layout', { parse(){}, render(){} });

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
    const type = String(yield this.liquid.evalValue(parts[0], ctx));
    const attrs = {};
    for (const part of parts.slice(type === 'product' ? 2 : 1)) {
      const m = part.match(/^([\w-]+)\s*:\s*(.+)$/); if (!m) continue;
      attrs[m[1]] = yield this.liquid.evalValue(m[2], ctx);
    }
    const attr = Object.entries(attrs).map(([k,v])=>`${k}="${v}"`).join(' ');
    const action = { product:'/cart/add', contact:'/contact', storefront_password:'/password', customer:'/contact' }[type] || '/';
    emitter.write(`<form method="post" action="${action}" accept-charset="UTF-8" enctype="multipart/form-data" ${attr}><input type="hidden" name="form_type" value="${type}"><input type="hidden" name="utf8" value="✓">`);
    const req = ctx.get(['request']) || {};
    ctx.push({ form: { errors: req.form_errors || null, 'posted_successfully?': !!req.form_posted, email: '', name: '', phone: '', body: '' } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
});

// ---- {% paginate collection.products by 12 %} ... {% endpaginate %}: slices the list and sets `paginate` like Shopify ----
engine.registerTag('paginate', {
  parse(token, remainTokens){
    this.args = token.args; this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens)
      .on('tag:endpaginate', ()=>stream.stop())
      .on('template', tpl=>this.tpls.push(tpl))
      .on('end', ()=>{ throw new Error('tag endpaginate not closed'); });
    stream.start();
  },
  * render(ctx, emitter){
    const m = this.args.match(/^(.+?)\s+by\s+(.+)$/);
    const list = (yield this.liquid.evalValue(m[1], ctx)) || [];
    const per = Number(yield this.liquid.evalValue(m[2], ctx)) || 12;
    const req = ctx.get(['request']) || {};
    const pages = Math.max(1, Math.ceil(list.length / per));
    const cur = Math.min(Math.max(1, Number(req.current_page) || 1), pages);
    const url = (n) => (req.page_urls || [])[n - 1] || '#';
    const nums = pages <= 7 ? [...Array(pages)].map((_, i) => i + 1) : [...new Set([1, cur - 1, cur, cur + 1, pages].filter(n => n >= 1 && n <= pages))];
    const parts = []; let last = 0;
    for (const n of nums) { if (n - last > 1) parts.push({ title: '…', is_link: false }); parts.push(n === cur ? { title: n, is_link: false } : { title: n, url: url(n), is_link: true }); last = n; }
    const paginate = { pages, current_page: cur, items: list.length, page_size: per, current_offset: (cur - 1) * per, previous: cur > 1 ? { url: url(cur - 1) } : null, next: cur < pages ? { url: url(cur + 1) } : null, parts };
    const [objName, prop] = m[1].trim().split('.');
    const slice = list.slice((cur - 1) * per, cur * per);
    const scope = prop ? { paginate, [objName]: { ...ctx.get([objName]), [prop]: slice } } : { paginate, [objName]: slice };
    ctx.push(scope);
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  },
});

const settingsSchema = JSON.parse(fs.readFileSync(path.join(T,'config/settings_schema.json'),'utf8'));
const gsettings={}; for(const g of settingsSchema) for(const s of g.settings||[]) if(s.id) gsettings[s.id]=s.default;
gsettings.scene_image={src:'/preview-images/hero-far.jpg',width:1376,height:768}; // preview: the demo photo as the default scene
const D='preview-images'; const has=f=>fs.existsSync(path.join(D,f)) ? '/'+D+'/'+f : undefined;
const pick=(o)=>Object.fromEntries(Object.entries(o).filter(([,v])=>v));
const imgs = {
  'featured-catalog': pick({ image_wall: has('catalog-wall.jpg') }),
  hero: pick({ image_far: has('hero-far.jpg'), image_open: has('hero-open.jpg') }),
};
const MENUS={ 'main-menu':[['Coffee','/collections/all'],['Collections','/collections'],['Journal','/blogs/journal'],['Our story','/pages/our-story'],['Contact','/pages/contact']], footer:[['Shop all','/collections/all'],['Journal','/blogs/journal'],['Search','/search'],['Contact','/pages/contact'],['Gift card','/gift']] };
const resolveMenus=(o)=>{ for(const k in o) if(typeof o[k]==='string' && MENUS[o[k]]) o[k]={ links: MENUS[o[k]].map(([title,url])=>({title,url,current:false})) }; return o; };
function defaults(arr){const o={};for(const s of arr||[]) if(s.id) o[s.id]= s.type==='link_list' && MENUS[s.default] ? { links: MENUS[s.default].map(([title,url])=>({title,url,current:false})) } : s.default; return o;}

// ---- demo product (only for the local preview; a real shop supplies its own) ----
function demoProduct(variantId){
  const sizes=['250 g','1 kg'], grinds=['Whole bean','Espresso','Filter'];
  const variants=[]; let id=4100;
  for(const s of sizes) for(const g of grinds){ id++; variants.push({ id, title:`${s} / ${g}`, options:[s,g], option1:s, option2:g, price: s==='250 g'?1800:5600, compare_at_price: s==='1 kg'?6400:null, available: !(s==='1 kg' && g==='Espresso'), sku:`YRG-${id}`, unit_price: s==='250 g'?720:560, unit_price_measurement:{reference_value:100,reference_unit:'g'}, featured_media:{ id: g==='Filter'?902:901 } }); }
  const media=[
    { id:901, media_type:'image', alt:'Closed coffee bag', src: has('product-bag-closed.jpg'), width:1000, height:1250 },
    { id:902, media_type:'image', alt:'Open coffee bag with beans', src: has('product-bag-open.jpg'), width:960, height:1200 },
    { id:903, media_type:'image', alt:'Coffee bag in the plantation', src: has('hero-far.jpg'), width:1376, height:768 },
    { id:904, media_type:'image', alt:'Open bag on the hillside', src: has('hero-open.jpg'), width:1672, height:941 },
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

// ---- demo cart: lives in memory in the preview server and mimics Shopify's Ajax Cart API ----
const CART = { items: [], note: '' };
const PLANS = { 11: { name: 'Every 2 weeks', pct: 10 }, 12: { name: 'Every month', pct: 7 } };
const itemKey = (id, plan) => `${id}:${plan || ''}`;
function buildCart(){
  const p = demoProduct();
  const items = CART.items.map((it, i) => {
    const v = p.variants.find(x => x.id == it.id);
    const plan = PLANS[it.plan];
    const orig = v.price, fin = plan ? Math.round(orig * (100 - plan.pct) / 100) : orig;
    return { key: itemKey(it.id, it.plan), id: it.id, quantity: it.quantity, url: `/products/${p.handle}?variant=${it.id}`, url_to_remove: `/cart/change?line=${i + 1}&quantity=0`,
      image: { src: p.media[v.options[1] === 'Filter' ? 1 : 0].src, alt: p.title }, product: { title: p.title, has_only_default_variant: false },
      variant: { title: v.title }, selling_plan_allocation: plan ? { selling_plan: { name: plan.name } } : null, properties: {},
      original_price: orig, final_price: fin, original_line_price: orig * it.quantity, final_line_price: fin * it.quantity };
  });
  const sub = items.reduce((n, i) => n + i.final_line_price, 0);
  return { items, item_count: items.reduce((n, i) => n + i.quantity, 0), items_subtotal_price: sub, total_price: sub, note: CART.note, cart_level_discount_applications: [] };
}
export const cartApi = {
  add(id, quantity = 1, plan = '') {
    const v = demoProduct().variants.find(x => x.id == id);
    if (!v) return { status: 404, body: { status: 404, message: 'Not Found', description: 'Cannot find variant' } };
    if (!v.available) return { status: 422, body: { status: 422, message: 'Cart Error', description: 'All 1 kg / Espresso are in your cart.' } };
    const line = CART.items.find(x => itemKey(x.id, x.plan) === itemKey(id, plan));
    if (line) line.quantity += quantity; else CART.items.push({ id: Number(id), quantity, plan: plan || '' });
    return { status: 200, body: { id: Number(id), quantity } };
  },
  change(key, quantity) {
    const i = CART.items.findIndex(x => itemKey(x.id, x.plan) === key);
    if (i < 0) return;
    if (quantity <= 0) CART.items.splice(i, 1); else CART.items[i].quantity = quantity;
  },
  changeLine(line, quantity) { const it = CART.items[line - 1]; if (it) this.change(itemKey(it.id, it.plan), quantity); },
  setNote(note) { CART.note = note || ''; },
  json: () => buildCart(),
  reset() { CART.items.length = 0; CART.note = ''; },
  items: () => CART.items,
};
export async function renderCartSection(id = 'main') {
  const tpl = JSON.parse(fs.readFileSync(path.join(T, 'templates/cart.json'), 'utf8'));
  const html = await renderSection(tpl.sections[id].type, id, tpl.sections[id], { request: { ...REQUEST, page_type: 'cart' } });
  return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
}

// ---- demo collection: 9 products, filters (availability, type, price), sorting, pages (page size comes from the section setting) ----
const SORTS = [['manual','Featured'],['best-selling','Best selling'],['title-ascending','Alphabetically, A-Z'],['title-descending','Alphabetically, Z-A'],['price-ascending','Price, low to high'],['price-descending','Price, high to low'],['created-descending','Date, new to old'],['created-ascending','Date, old to new']];
const COFFEES = [
  ['Ethiopia Yirgacheffe','Single origin',1800,5600,0,true],['Colombia Huila','Single origin',1700,5300,0,true],['Kenya AA Nyeri','Single origin',1900,5900,0,true],
  ['Guatemala Antigua','Single origin',1650,5100,0,true],['Brazil Santos','Single origin',1500,0,0,false],['Sumatra Mandheling','Single origin',1750,0,0,true],
  ['House Blend','Blend',1500,0,1800,true],['Swiss Water Decaf','Decaf',1850,0,0,true],['Tasting Box (4 x 100 g)','Gift',4900,0,0,true],
];
function demoCollection(handle, q){
  const imgs = ['product-bag-closed.jpg','product-bag-open.jpg','hero-far.jpg','hero-open.jpg'].map(f=>has(f));
  const ALL = COFFEES.map(([title,type,price,max,compare,available],i)=>{
    const media=[0,1].map(k=>({ id:100+i*2+k, media_type:'image', alt:title, preview_image:{ src: imgs[(i+k)%4] } }));
    const handleP = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return { id:i+1, title, handle:handleP, url:`/products/${handleP}`, type, vendor:'Altura', price, price_min:price, price_max:max||price, price_varies:!!max, compare_at_price:compare||null, available, featured_media:media[0], media, idx:i };
  });
  const act = { avail:q.getAll('filter.v.availability'), type:q.getAll('filter.p.product_type'), gte:q.get('filter.v.price.gte'), lte:q.get('filter.v.price.lte') };
  const has2 = (v)=> v!==null && v!=='';
  const match = (p, skip) => (skip==='avail' || !act.avail.length || act.avail.includes(p.available?'1':'0'))
    && (skip==='type' || !act.type.length || act.type.includes(p.type))
    && (skip==='price' || ((!has2(act.gte) || p.price>=Math.round(act.gte*100)) && (!has2(act.lte) || p.price<=Math.round(act.lte*100))));
  const base = `/collections/${handle}`;
  const urlWith = (fn, page) => { const n = new URLSearchParams(q); n.delete('page'); fn(n); if (page>1) n.set('page', page); const qs=n.toString(); return qs ? `${base}?${qs}` : base; };
  const withoutValue = (param,value)=> urlWith(n=>{ const keep=n.getAll(param).filter(v=>v!==value); n.delete(param); keep.forEach(v=>n.append(param,v)); });
  const withValue = (param,value)=> urlWith(n=>n.append(param,value));
  const listFilter = (label, param, key, values) => ({ label, param_name:param, type:'list',
    active_values: values.filter(v=>q.getAll(param).includes(v.value)).map(v=>({ label:v.label, value:v.value, url_to_remove: withoutValue(param,v.value) })),
    url_to_remove: urlWith(n=>n.delete(param)),
    values: values.map(v=>{ const active=q.getAll(param).includes(v.value); const count=ALL.filter(p=>match(p,key)&&v.test(p)).length; return { label:v.label, value:v.value, param_name:param, count, active, url_to_add:withValue(param,v.value), url_to_remove:withoutValue(param,v.value) }; }) });
  const filters = [
    listFilter('Availability','filter.v.availability','avail',[{label:'In stock',value:'1',test:p=>p.available},{label:'Out of stock',value:'0',test:p=>!p.available}]),
    listFilter('Product type','filter.p.product_type','type',[...new Set(ALL.map(p=>p.type))].map(t=>({label:t,value:t,test:p=>p.type===t}))),
    { label:'Price', type:'price_range', range_max: Math.max(...ALL.map(p=>p.price)),
      min_value:{ param_name:'filter.v.price.gte', value: has2(act.gte) ? Math.round(act.gte*100) : null }, max_value:{ param_name:'filter.v.price.lte', value: has2(act.lte) ? Math.round(act.lte*100) : null },
      url_to_remove: urlWith(n=>{ n.delete('filter.v.price.gte'); n.delete('filter.v.price.lte'); }) },
  ];
  const sort = SORTS.some(([v])=>v===q.get('sort_by')) ? q.get('sort_by') : 'manual';
  const by = { 'manual':(a,b)=>a.idx-b.idx, 'best-selling':(a,b)=>(b.idx*7%9)-(a.idx*7%9), 'title-ascending':(a,b)=>a.title.localeCompare(b.title), 'title-descending':(a,b)=>b.title.localeCompare(a.title), 'price-ascending':(a,b)=>a.price-b.price, 'price-descending':(a,b)=>b.price-a.price, 'created-descending':(a,b)=>b.idx-a.idx, 'created-ascending':(a,b)=>a.idx-b.idx }[sort];
  const products = ALL.filter(p=>match(p)).sort(by);
  return { collection: { title: handle==='all'?'Products':handle[0].toUpperCase()+handle.slice(1), handle, url:base, description:'<p>Small-lot coffees from high farms, roasted to order and shipped within 48 hours.</p>',
    products, products_count:products.length, filters, sort_by:sort, default_sort_by:'manual', sort_options:SORTS.map(([value,name])=>({value,name})) },
    pageUrls: (n)=>urlWith(()=>{}, n) };
}
function collectionExtra(handle, query){
  const q = query instanceof URLSearchParams ? query : new URLSearchParams(query||'');
  const { collection, pageUrls } = demoCollection(handle, q);
  const pages = 50; // enough urls; the paginate tag only reads the ones it needs
  return { collection, request: { ...REQUEST, page_type:'collection', current_page: Number(q.get('page'))||1, page_urls: Array.from({length:pages},(_,i)=>pageUrls(i+1)) } };
}
export async function renderCollectionSection(id='main', handle='all', query=''){
  const tpl = JSON.parse(fs.readFileSync(path.join(T,'templates/collection.json'),'utf8'));
  const settings = { ...tpl.sections[id], settings: { ...tpl.sections[id].settings, image_fit:'cover', products_per_page:8 } };
  const html = await renderSection(tpl.sections[id].type, id, settings, collectionExtra(handle, query));
  return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
}


// ---- demo content pages: collections list, blog + articles, search, page, contact, 404, password, gift card ----
function demoSite(){
  const photo = (f)=> ({ src: has(f), width: 1200, height: 800, alt: '' });
  const topics = [['Brewing','Brew guide: pour-over that tastes like the farm','<p>Water temperature matters more than most people think. Start at <strong>94 °C</strong>, rinse the filter, and bloom for 40 seconds.</p><h2>Grind and ratio</h2><p>Medium-fine, 15 g of coffee to 250 ml of water. Pour in slow circles and finish by 2:45.</p><blockquote>If it tastes sour, grind finer. If it tastes bitter, grind coarser.</blockquote><h3>Troubleshooting</h3><ul><li>Sour: finer grind or hotter water.</li><li>Bitter: coarser grind or cooler water.</li><li>Flat: fresher beans.</li></ul><p>That is the whole method. Everything else is taste.</p>','hero-open.jpg','Maria Lopez'],
    ['Farms','A morning in Gedeo: where Yirgacheffe begins','<p>At 1,900 metres the air is thin and the cherries ripen slowly, which is exactly why the cup is so floral.</p><p>We spent a week with the families who pick, wash and dry on raised beds.</p>','hero-far.jpg','Santiago R.'],
    ['Roasting','Why we roast on Mondays and Thursdays','<p>Fresh matters. Coffee needs a few days to rest after roasting, so we time every batch to arrive when it tastes best.</p>','product-bag-open.jpg','Maria Lopez'],
    ['Brewing','Espresso at home without a fancy machine','<p>You do not need a thousand-dollar machine. You need a scale, a timer and fresh beans.</p>','product-bag-closed.jpg','Santiago R.'],
    ['Farms','Honey, washed, natural: what the process changes','<p>Processing is how the fruit is removed from the seed, and it shapes the cup more than most people expect.</p>','hero-open.jpg','Maria Lopez'],
    ['Roasting','Light vs dark: what changes in the cup','<p>Light roasts keep the origin. Dark roasts bring the roast. Pick what you want to taste.</p>','hero-far.jpg','Santiago R.'],
    ['Brewing','Cold brew in a jar, 12 hours, zero stress','<p>Coarse grind, cold water, a jar and the fridge overnight. That is the recipe.</p>','product-bag-open.jpg','Maria Lopez'],
    ['Farms','Meet the producers behind our Kenya lot','<p>The cooperative at Nyeri has been washing cherries since the 1960s.</p>','product-bag-closed.jpg','Santiago R.'],
    ['Roasting','How to read a roast date','<p>The date on the bag is the day the coffee left the roaster. Wait a few days, then drink within a month.</p>','hero-open.jpg','Maria Lopez'],
    ['Brewing','The best grind size for every brewer','<p>Espresso fine, pour-over medium-fine, French press coarse. Adjust by taste.</p>','hero-far.jpg','Santiago R.'],
  ];
  const blog = { title:'Journal', url:'/blogs/journal', handle:'journal' };
  const ARTICLES = topics.map(([tag,title,content,img,author],i)=>({
    object_type:'article', id:i+1, title, url:`/blogs/journal/${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`, author, tags:[tag],
    published_at:new Date(Date.UTC(2026,10,20-i*4)).toISOString(), content, excerpt_or_content:content.replace(/<[^>]+>/g,' ').slice(0,300),
    image: has(img)?{ src:has(img), alt:title, width:1200, height:800 }:null, blog,
  }));
  return { blog, ARTICLES };
}
function demoPageExtra(kind, opts={}){
  const { blog, ARTICLES } = demoSite();
  const q = opts.query instanceof URLSearchParams ? opts.query : new URLSearchParams(opts.query||'');
  const pageN = Number(q.get('page'))||1;
  const urls = (base)=> Array.from({length:30},(_,i)=> i===0 ? base : `${base}?page=${i+1}`);
  const tag = opts.tag || null;
  if (kind==='list-collections'){
    const imgsList=['hero-far.jpg','product-bag-open.jpg','hero-open.jpg','product-bag-closed.jpg'].map(has);
    const names=['Single origin','Blends','Decaf','Gift boxes','Brewing gear','Subscriptions','Merch'];
    const collections = names.map((t,i)=>({ title:t, url:`/collections/${t.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, products_count:[6,2,1,3,5,2,4][i], featured_image:{src:imgsList[i%4],width:900,height:1100}, products:[] }));
    return { collections, request:{...REQUEST,page_type:'list-collections',current_page:pageN,page_urls:urls('/collections')} };
  }
  if (kind==='page' || kind==='contact'){
    const page = kind==='page'
      ? { title:'Our story', content:'<p>Altura started on a hillside at 1,900 metres with a simple idea: coffee should taste like the place it comes from.</p><h2>What we do</h2><p>We buy directly from small farms, roast every Monday and Thursday, and ship within 48 hours.</p><blockquote>Fresh, traceable, honest.</blockquote><p>Questions? <a href="/pages/contact">Write to us</a>.</p>' }
      : { title:'Contact', content:'<p>Questions about an order or a brew? Send us a message and a real person will reply within one business day.</p>' };
    return { page, request:{...REQUEST,page_type:'page', form_posted: opts.query?.get?.('sent')==='1' || false} };
  }
  if (kind==='blog'){
    const list = tag ? ARTICLES.filter(a=>a.tags.includes(tag)) : ARTICLES;
    return { blog:{ ...blog, articles:list, articles_count:list.length, all_tags:['Brewing','Farms','Roasting'] }, current_tags: tag?[tag]:null, request:{...REQUEST,page_type:'blog',current_page:pageN,page_urls:urls('/blogs/journal')} };
  }
  if (kind==='article'){
    const a = ARTICLES[Number(opts.index)||0];
    return { article:a, blog:{ ...blog, articles:ARTICLES, previous_article: ARTICLES[(Number(opts.index)||0)+1] ? {url:ARTICLES[(Number(opts.index)||0)+1].url,title:ARTICLES[(Number(opts.index)||0)+1].title}:null, next_article: ARTICLES[(Number(opts.index)||0)-1] ? {url:ARTICLES[(Number(opts.index)||0)-1].url,title:ARTICLES[(Number(opts.index)||0)-1].title}:null }, request:{...REQUEST,page_type:'article'} };
  }
  if (kind==='search'){
    const terms = (q.get('q')||'').trim();
    const products = demoCollection('all', new URLSearchParams()).collection.products.map(p=>({...p, object_type:'product'}));
    const pages = [{ object_type:'page', title:'Our story', url:'/pages/our-story', content:'<p>Altura started on a hillside at 1,900 metres.</p>' }];
    const all = [...products, ...ARTICLES, ...pages];
    const results = terms ? all.filter(r=>(r.title+' '+(r.content||'')+' '+(r.type||'')).toLowerCase().includes(terms.toLowerCase())) : [];
    return { search:{ performed: !!terms, terms, results, results_count: results.length }, request:{...REQUEST,page_type:'search',current_page:pageN,page_urls:urls('/search?q='+encodeURIComponent(terms))} };
  }
  if (kind==='password') return { shop_password:true, request:{...REQUEST,page_type:'password',form_errors: q.get('wrong')==='1' ? ['password'] : null, form_posted: q.get('sent')==='1'} };
  if (kind==='gift_card') return { gift_card:{ code:'ab12cd34ef56gh78', balance:5000, initial_value:7500, enabled:true, expired:false, expires_on:'2027-11-20', pass_url:'/pass', url:'/gift' }, request:{...REQUEST,page_type:'gift_card'} };
  return { request:{...REQUEST,page_type:kind} };
}

async function renderSection(name,id,tpl,extra={}){
  const raw=fs.readFileSync(path.join(T,'sections',name+'.liquid'),'utf8');
  const m=raw.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema=JSON.parse(m[1]); const body=raw.replace(m[0],'');
  const settings=resolveMenus({...defaults(schema.settings), ...(imgs[name]||{}), ...(tpl?.settings||{})});
  const bt=Object.fromEntries((schema.blocks||[]).map(b=>[b.type,b]));
  const blocks=[];
  if (tpl?.blocks) {
    for (const bid of tpl.block_order||Object.keys(tpl.blocks)) { const b=tpl.blocks[bid]; blocks.push({id:bid,type:b.type,settings:{...defaults(bt[b.type]?.settings),...(b.settings||{})},shopify_attributes:''}); blocks[blocks.length-1].settings=resolveMenus(blocks[blocks.length-1].settings); }
  } else {
    const preset=(schema.presets||[])[0]||{};
    for(const b of preset.blocks||[]) blocks.push({type:b.type,settings:{...defaults(bt[b.type]?.settings),...(b.settings||{})},shopify_attributes:''});
    if(!blocks.length && schema.max_blocks!==0 && (schema.blocks||[]).length){ for(let i=0;i<4;i++){ const b=schema.blocks[0]; blocks.push({type:b.type,settings:defaults(b.settings),shopify_attributes:''}); } }
  }
  return engine.parseAndRender(body,{section:{id,settings,blocks},settings:gsettings,shop:SHOP,routes:ROUTES,linklists:{},request:REQUEST,collections:{},products:[],cart:buildCart(),...extra});
}
const SHOP={name:'Altura',url:'https://altura.example',money_format:'${{amount}}',enabled_payment_types:['visa','master','american_express','shopify_pay'],password_message:'<p>We are roasting the first batches. Leave your email and we will tell you the day we open.</p>'};
const ROUTES={root_url:'/',cart_url:'/cart',all_products_collection_url:'/collections/all',product_recommendations_url:'/recommendations/products',search_url:'/search'};
const REQUEST={locale:{iso_code:'en'},page_type:'index'};

export async function renderRecs(sectionId='recommendations', limit=4){
  const tpl=JSON.parse(fs.readFileSync(path.join(T,'templates/product.json'),'utf8')).sections.recommendations;
  const products=demoCollection('all',new URLSearchParams()).collection.products.slice(1,1+limit);
  const html=await renderSection('product-recommendations',sectionId,tpl,{product:demoProduct(),recommendations:{performed:true,products_count:products.length,products}});
  return `<div id="shopify-section-${sectionId}" class="shopify-section">${html}</div>`;
}
export async function render(kind='index', opts={}){
  const tplName = kind==='contact' ? 'page.contact' : kind;
  if (kind==='gift_card') return renderGiftCard(opts);
  const tpl=JSON.parse(fs.readFileSync(path.join(T,`templates/${tplName}.json`),'utf8'));
  let extra = kind==='product' ? { product: demoProduct(opts.variant) } : {};
  if (kind==='collection') extra = collectionExtra(opts.handle||'all', opts.query);
  else if (!['index','product','cart'].includes(kind)) extra = demoPageExtra(kind, opts);
  const request = extra.request || {...REQUEST, page_type: kind};
  // the demo photos are lifestyle shots (not product shots on white), so the preview fills the frame and skips the blend
  if (kind==='product') tpl.sections.main.settings={...tpl.sections.main.settings, image_fit:'cover', scene_image:{src:'/preview-images/hero-far.jpg',width:1376,height:768}};
  if (kind==='collection') tpl.sections.main.settings={...tpl.sections.main.settings, image_fit:'cover', products_per_page:8, scene_image:{src:'/preview-images/hero-far.jpg',width:1376,height:768}};
  if (kind==='cart') tpl.sections.main.settings={...tpl.sections.main.settings, scene_image:{src:'/preview-images/hero-open.jpg',width:1672,height:941}};
  let main=''; for(const id of tpl.order){ main+=await renderSection(tpl.sections[id].type,id,tpl.sections[id],{...extra,request});}
  let layout=fs.readFileSync(path.join(T,`layout/${kind==='password'?'password':'theme'}.liquid`),'utf8');
  const header=kind==='password'?'':await renderGroup('header-group'), footer=kind==='password'?'':await renderGroup('footer-group');
  layout=layout.replace(/{%\s*sections? '(header|header-group)'\s*%}/,'__H__').replace(/{%\s*sections? '(footer|footer-group)'\s*%}/,'__F__').replace('{{ content_for_layout }}','__M__');
  let html=await engine.parseAndRender(layout,{settings:gsettings,shop:SHOP,request,routes:ROUTES,cart:buildCart(),...extra,page_title:kind==='404'?'Page not found – Altura':kind==='product'?'Ethiopia Yirgacheffe – Altura':kind==='cart'?'Your cart – Altura':kind==='collection'?'Coffee – Altura':'Altura',canonical_url:'',content_for_header:''});
  html=html.replace('__H__',header).replace('__F__',footer).replace('__M__',main);
  return html;
}

// {% sections 'x-group' %}: every section wrapped like Shopify does (the wrapper is what a sticky header sticks to)
async function renderGroup(name){
  const g=JSON.parse(fs.readFileSync(path.join(T,`sections/${name}.json`),'utf8')); let out='';
  for(const id of g.order){ const sec=g.sections[id]; out+=`<div id="shopify-section-${id}" class="shopify-section shopify-section-group-${name}">${await renderSection(sec.type,id,sec)}</div>`; }
  return out;
}
async function renderGiftCard(opts){
  const raw=fs.readFileSync(path.join(T,'templates/gift_card.liquid'),'utf8');
  const extra=demoPageExtra('gift_card',opts);
  return engine.parseAndRender(raw,{settings:gsettings,shop:SHOP,routes:ROUTES,...extra,content_for_header:''});
}

// Shopify exposes these everywhere, even inside {% render %}ed snippets
engine.options.globals = { settings: gsettings, shop: SHOP, routes: ROUTES };
