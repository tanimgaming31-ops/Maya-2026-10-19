/* V54: deterministic voice commands; no unsupported open-ended phone automation. */
const tidy=s=>String(s||'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/g,' ').trim();
export function parseV54Voice(raw){
 const v=tidy(raw).replace(/[০-৯]/gu,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));if(v.length>900)return null;
 const head=v.match(/^(?:hey\s+)?(?:maya|মায়া|মায়া)\s*[,،:]?\s+(.+)$/iu);
 if(!head)return null;
 const cmd=head[1];
 if(/^(?:read|check|show)(?:\s+(?:my|recent|the))?\s+notifications?$|^(?:নোটিফিকেশন|নোটিফিকেশনগুলো)\s+(?:পড়ো|দেখাও|চেক করো)$/iu.test(cmd))return {kind:'notificationList'};
 if(/^(?:reply to|answer)\s+(?:the\s+)?(?:last\s+)?notification$|^নোটিফিকেশনের\s+রিপ্লাই\s+(?:দাও|করো)$/iu.test(cmd))return {kind:'notificationReplyPanel'};
 if(/^(?:select|choose|pick)\s+(?:a\s+)?folder$|^(?:ফোল্ডার|ফোল্ডারটা)\s+(?:বেছে নাও|সিলেক্ট করো|নির্বাচন করো)$/iu.test(cmd))return {kind:'folderPick'};
 if(/^(?:list|show|check)\s+(?:my\s+)?(?:folder|files|documents)$|^(?:ফাইল|ফাইলগুলো|ফোল্ডার)\s+(?:দেখাও|দেখো)$/iu.test(cmd))return {kind:'folderList'};
 let m=cmd.match(/^save\s+(?:a\s+)?file\s+([A-Za-z0-9 _.-]{1,80}\.txt)\s+with\s+(.+)$/iu);
 if(m&&m[2].length<=500)return {kind:'fileSave',name:m[1],text:m[2]};
 m=cmd.match(/^remind\s+me\s+in\s+(\d{1,4})\s+(minutes?|hours?)\s+to\s+(.+)$/iu);
 if(m){const minutes=Number(m[1])*(m[2].toLowerCase().startsWith('hour')?60:1);
  if(minutes>=1&&minutes<=525600&&m[3].length<=120)return {kind:'reminder',minutes,title:m[3]};return null;}
 m=cmd.match(/^(\d{1,4})\s+মিনিট\s+পরে\s+(.+?)\s+মনে\s+কর(?:িয়ে|িয়ে)\s+দাও$/u);
 if(m&&Number(m[1])>=1&&Number(m[1])<=525600&&m[2].length<=120)return {kind:'reminder',minutes:Number(m[1]),title:m[2]};
 m=cmd.match(/^(?:macro|app macro)\s+(.+?)\s+tap\s+(.+)$/iu);
 if(m&&m[1].length<=100&&m[2].length<=48&&!/(send|delete|purchase|pay|checkout|confirm|submit|password|install|allow|otp|transfer|buy|remove|reset|uninstall|authorize|permission|security|payment|verify|login|sign in|পাঠা|মুছ|ডিলিট|কিন|পেমেন্ট|অনুমতি)/iu.test(m[2]))return {kind:'macro',app:m[1],label:m[2]};
 m=cmd.match(/^(?:run|start)\s+(?:my\s+)?routine\s+(.+)$/iu);
 if(m&&m[1].length<=70)return {kind:'routine',name:m[1]};
 if(/^(?:v54|phone automation)\s+(?:status|dashboard)$|^(?:অটোমেশন|ফোনের কাজ)\s+(?:স্ট্যাটাস|দেখাও)$/iu.test(cmd))return {kind:'status'};
 return null;
}
