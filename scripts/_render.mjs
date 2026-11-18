import { Liquid } from 'liquidjs';
import fs from 'node:fs'; import path from 'node:path';
const T = path.resolve('theme');
const engine = new Liquid({ root:[path.join(T,'snippets')], extname:'.liquid', jsTruthy:false, strictFilters:false, strictVariables:false });
engine.registerFilter('asset_url', v=>'/assets/'+v);
engine.registerFilter('stylesheet_tag', u=>`<link rel="stylesheet" href="${u}">`);
engine.registerFilter('t', k=>k);
engine.registerFilter('image_url', v=>v);
engine.registerFilter('image_tag', (url,...args)=>{ const a={}; for(const x of args) if(Array.isArray(x)) a[x[0]]=x[1]; return `<img src="${url}" class="${a.class||''}" loading="${a.loading||'lazy'}" ${a.fetchpriority?`fetchpriority="${a.fetchpriority}"`:''} alt="${a.alt||''}">`; });
engine.registerFilter('money', v=>'$'+v);
const settingsSchema = JSON.parse(fs.readFileSync(path.join(T,'config/settings_schema.json'),'utf8'));
const gsettings={}; for(const g of settingsSchema) for(const s of g.settings||[]) if(s.id) gsettings[s.id]=s.default;
const D='preview-images'; const has=f=>fs.existsSync(path.join(D,f)) ? '/'+D+'/'+f : undefined;
const pick=(o)=>Object.fromEntries(Object.entries(o).filter(([,v])=>v));
const imgs = {
  'featured-catalog': pick({ image_wall: has('catalog-wall.jpg') }),
  hero: pick({ image_far: has('hero-far.jpg'), image_open: has('hero-open.jpg'), image_inside: has('hero-inside.jpg') }),
};
function defaults(arr){const o={};for(const s of arr||[]) if(s.id) o[s.id]=s.default; return o;}
async function renderSection(name,id){
  const raw=fs.readFileSync(path.join(T,'sections',name+'.liquid'),'utf8');
  const m=raw.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema=JSON.parse(m[1]); const body=raw.replace(m[0],'');
  const settings={...defaults(schema.settings), ...(imgs[name]||{})};
  const blocks=[];
  const preset=(schema.presets||[])[0]||{};
  const bt=Object.fromEntries((schema.blocks||[]).map(b=>[b.type,b]));
  for(const b of preset.blocks||[]) blocks.push({type:b.type,settings:{...defaults(bt[b.type]?.settings),...(b.settings||{})},shopify_attributes:''});
  if(!blocks.length && schema.max_blocks!==0 && (schema.blocks||[]).length){ for(let i=0;i<4;i++){ const b=schema.blocks[0]; blocks.push({type:b.type,settings:defaults(b.settings),shopify_attributes:''}); } }
  return engine.parseAndRender(body,{section:{id,settings,blocks},settings:gsettings,shop:{name:'Altura'},routes:{root_url:'/'},linklists:{},request:{locale:{iso_code:'es'}},collections:{},products:[]});
}
export async function render(){
const idx=JSON.parse(fs.readFileSync(path.join(T,'templates/index.json'),'utf8'));
let main=''; for(const id of idx.order){ main+=await renderSection(idx.sections[id].type,id);}
let layout=fs.readFileSync(path.join(T,'layout/theme.liquid'),'utf8');
const header=await renderSection('header','header'), footer=await renderSection('footer','footer');
layout=layout.replace(/{%\s*section 'header'\s*%}/,'__H__').replace(/{%\s*section 'footer'\s*%}/,'__F__').replace('{{ content_for_layout }}','__M__');
let html=await engine.parseAndRender(layout,{settings:gsettings,request:{locale:{iso_code:'es'}},page_title:'Test',canonical_url:'',content_for_header:''});
html=html.replace('__H__',header).replace('__F__',footer).replace('__M__',main);
return html;
}
