// Integra recapiti-osm.js e recapiti-parafarmacie.js con un censimento .md (colonna Fonte = oggetto OSM).
// Uso: node scripts/importa-censimento.mjs censimento.md   (non sovrascrive dati esistenti né schede verificate)
import fs from "fs";
const D=new URL("../docs/",import.meta.url).pathname;
const raw=f=>fs.readFileSync(D+f,"utf8");
const parse=(f,g)=>{const t=raw(f);const i=t.indexOf("{"),j=t.lastIndexOf("}");return {head:t.slice(0,t.indexOf("window.")),obj:JSON.parse(t.slice(i,j+1)),g};};
const A=parse("recapiti-osm.js","recapitiOSM"),B=parse("recapiti-parafarmacie.js","recapitiParafarmacie");
const sv=new Function("window",raw("schede-verificate.js")+";return window.schedeVerificate")({});
const verified=new Set(sv.map(e=>e.id));
const reg=new Function("window",raw("recapiti-regionali.js")+";return window.recapitiRegionali")({}).records;
const un=s=>s.replace(/&#x27;/g,"'").replace(/&amp;/g,"&");
const st={nuovi:0,tel:0,web:0,orari:0,scartati:0};
for(const l of fs.readFileSync(process.argv[2],"utf8").split("\n")){
 if(!l.startsWith("| ")||l.includes("--- |")) continue;
 const c=l.split(" | ").map(s=>s.replace(/^\| /,"").replace(/ \|$/,""));
 if(c.length<11||!/^(Farmacia|Parafarmacia)/.test(c[2])) continue;
 const para=c[2].startsWith("Parafarmacia"), id=para?5000000+Number(c[3]):Number(c[3]);
 const m=c[10].match(/^\[OSM\]\(<https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/(\d+)>\)$/); if(!m) continue;
 if(verified.has(id)) continue;
 const T=para?B:A, recs=T.obj.records, old=recs[id];
 let ph=c[7]==="—"?"":c[7].replace(/[^\d]/g,""); ph=ph.replace(/^(00)?39(?=\d{9,11}$)/,"");ph=/^\d{6,11}$/.test(ph)?"+39"+ph:null;
 const wm=c[8].match(/\((?:<)?(https?:\/\/[^>)]+)/); const web=wm?wm[1]:null;
 const hrs=c[9]==="—"?null:un(c[9]);
 const rec=old?old.slice():[m[1],Number(m[2]),null,null,null];
 let ch=false;
 if(ph&&!rec[2]&&!(reg[id]&&!old)){rec[2]=ph;st.tel++;ch=true} else if(ph&&!rec[2]){rec[2]=ph;st.tel++;ch=true}
 if(web&&!rec[3]){rec[3]=web;st.web++;ch=true}
 if(hrs&&!rec[4]){rec[4]=hrs;st.orari++;ch=true}
 if(ch){ if(!old)st.nuovi++; recs[id]=rec; }
}
console.log(st);
for(const T of [A,B]) fs.writeFileSync(D+(T===A?"recapiti-osm.js":"recapiti-parafarmacie.js"),T.head+"window."+T.g+" = "+JSON.stringify(T.obj)+";\n");
