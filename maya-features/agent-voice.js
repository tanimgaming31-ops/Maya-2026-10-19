/* Maya V30: narrow, testable bilingual voice commands for the eight Agent tools.
   Every command needs explicit Maya/মায়া prefix, and does not grant Android privileges. */
const safe=s=>String(s||'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/g,' ').trim();
const limit=(s,n=300)=>safe(s).slice(0,n);
export function parseAgentVoice(input){
 const t=safe(input);
 if(!t||t.length>950)return null;
 const m=t.match(/^(?:(?:hey\s+)?maya|মায়া|মায়া)\s*[,،:!\-]?\s+(.+)$/iu);
 if(!m)return null;
 const cmd=m[1].trim();
 if(/^(?:cancel|stop|abort)\s+(?:the\s+)?(?:agent|task|research|plan)$|^(?:এজেন্ট|টাস্ক|রিসার্চ|প্ল্যান)\s+(?:বন্ধ করো|থামাও|বাতিল করো)$/iu.test(cmd))return {kind:'cancel'};
 if(/^(?:show|open|read|tell)\s+(?:me\s+)?(?:the\s+)?(?:agent\s+)?(?:task\s+history|agent\s+dashboard|task\s+status|agent\s+status)$|^(?:এজেন্ট\s+)?(?:টাস্ক\s+স্ট্যাটাস|টাস্ক\s+হিস্ট্রি|ড্যাশবোর্ড)\s*(?:দেখাও|বলো|খোলো)?$/iu.test(cmd))return {kind:'dashboard'};
 if(/^(?:run|execute|start)\s+(?:(?:my|the|saved|current)\s+)?(?:agent\s+)?plan$|^(?:প্ল্যান|পরিকল্পনা)\s+(?:চালাও|চালু করো|শুরু করো|এক্সিকিউট করো)$/iu.test(cmd))return {kind:'runPlan'};
 if(/^(?:choose|select|read|analy[sz]e|summari[sz]e|explain)\s+(?:my\s+)?(?:selected\s+)?(?:pdf|file|document|photo|image)(?:\s+(?:file|please))?$|^(?:আমার\s+)?(?:পিডিএফ|পিডিএফটা|ফাইল|ডকুমেন্ট|ছবি)\s+(?:পড়ো|পড়ে শোনাও|বিশ্লেষণ করো|বুঝিয়ে দাও|দেখো)$/iu.test(cmd))return {kind:'file'};
 let v=cmd.match(/^(?:deep\s+research|research|investigate|find\s+out|look\s+up)\s+(?:about\s+|on\s+|for\s+)?(.+)$/iu)
   ||cmd.match(/^(.+?)\s+(?:নিয়ে|সম্পর্কে|বিষয়ে|বিষয়ে)\s+(?:ডিপ\s+)?(?:রিসার্চ করো|গবেষণা করো|তথ্য খুঁজে দাও)$/u)
   ||cmd.match(/^(.+?)\s+(?:খবর|তথ্য)\s+(?:খুঁজে দাও|বের করো)$/u);
 if(v&&limit(v[1],160).length>=3)return {kind:'research',topic:limit(v[1],160)};
 v=cmd.match(/^(?:make|create|prepare|build)\s+(?:an?\s+)?(?:ai\s+|agent\s+|research\s+)?plan\s+(?:for|about|on)\s+(.+)$/iu)
   ||cmd.match(/^(.+?)\s+(?:নিয়ে|নিয়ে|সম্পর্কে)\s+(?:প্ল্যান|পরিকল্পনা)\s+(?:করো|বানাও|তৈরি করো)$/u);
 if(v&&limit(v[1],400).length>=5)return {kind:'plan',goal:limit(v[1],400)};
 v=cmd.match(/^(?:agent\s+)?(?:do|complete|execute|finish)\s+(?:research\s+on\s+|the\s+task\s+of\s+|this\s+task\s+)?(.+)$/iu)
   ||cmd.match(/^(.+?)\s+(?:নিজে\s+নিজে\s+)?(?:এজেন্ট\s+দিয়ে\s+)?(?:কাজটা|কাজটি)\s+(?:করো|করে দাও)$/u);
 if(v&&limit(v[1],400).length>=5)return {kind:'autoPlan',goal:limit(v[1],400)};
 v=cmd.match(/^(?:search\s+(?:on\s+|the\s+)?(?:web|google|browser)\s+(?:for\s+)?|browser\s+search\s+(?:for\s+)?)(.+)$/iu)
   ||cmd.match(/^(?:ব্রাউজারে|গুগলে|ওয়েবে|ওয়েবে)\s+(.+?)\s+(?:সার্চ করো|খোঁজো|খুঁজে দাও)$/u);
 if(v&&limit(v[1],250).length>=2)return {kind:'browser',query:limit(v[1],250)};
 v=cmd.match(/^(?:open\s+(?:the\s+)?(?:website|link|url)\s+)(https:\/\/\S+)$/iu);
 if(v)return {kind:'url',url:v[1]};
 v=cmd.match(/^(?:open\s+(?:the\s+)?(?:phone\s+)?app\s+)(.+)$/iu)
   ||cmd.match(/^(?:ফোনে|মোবাইলে)\s+(.+?)\s+(?:অ্যাপ\s+)?(?:খোলো|ওপেন করো|চালু করো)$/u);
 if(v&&limit(v[1],100).length>=2)return {kind:'phone',name:limit(v[1],100)};
 v=cmd.match(/^(?:fix|debug|review|check|explain)\s+(?:the\s+|my\s+)?code(?:\s+(.+))?$/iu)
   ||cmd.match(/^(?:কোড|কোডটা|আমার কোড)\s+(?:ঠিক করো|চেক করো|ভুল খুঁজে দাও|বিশ্লেষণ করো)(?:\s+(.+))?$/u);
 if(v)return {kind:'code',code:limit(v[1]||'',450)};
 return null;
}
export function voiceAgentSummary(input){
 const r=String(input||'').replace(/\s+/g,' ').trim();
 return r.length>430?r.slice(0,427)+'…':r;
}
