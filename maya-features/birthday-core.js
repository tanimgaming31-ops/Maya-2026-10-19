/* Maya Birthday Memory — creator-confirmed creation date, never fabricated clock time. */
export const BIRTHDAY_KEY='maya.birthday.v1';
export const MAYA_CREATED_DATE='2026-10-19';
const VERSION=1;
const DAY_MS=86400000;
const ymd=date=>[date.getFullYear(),date.getMonth()+1,date.getDate()];
const ordinal=n=>String(n).padStart(2,'0');
const isoLocal=date=>{const [y,m,d]=ymd(date);return y+'-'+ordinal(m)+'-'+ordinal(d);};
const isClock=t=>t===null||typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
const isZone=z=>z===null||typeof z==='string'&&/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(z)&&z.length<=64;
export function validBirthday(x){
 return !!x&&typeof x==='object'&&!Array.isArray(x)&&x.version===VERSION&&x.date===MAYA_CREATED_DATE&&isClock(x.time)&&isZone(x.timezone);
}
export function defaultBirthday(){return {version:VERSION,date:MAYA_CREATED_DATE,time:null,timezone:null};}
export function readBirthday(storage=localStorage){
 try{
  const text=storage.getItem(BIRTHDAY_KEY);
  if(!text)return defaultBirthday();
  const data=JSON.parse(text);
  return validBirthday(data)?{...defaultBirthday(),...data}:defaultBirthday();
 }catch{return defaultBirthday();}
}
export function saveBirthday(time=null,timezone=null,storage=localStorage){
 const data={version:VERSION,date:MAYA_CREATED_DATE,time:time||null,timezone:timezone||null};
 if(!validBirthday(data))throw Error('Choose a valid 24-hour time and timezone or leave both unknown.');
 storage.setItem(BIRTHDAY_KEY,JSON.stringify(data));return data;
}
export function birthdayAge(now=new Date(),record=defaultBirthday()){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Current date is invalid.');
 if(!validBirthday(record))throw Error('Birthday record invalid.');
 const [cy,cm,cd]=ymd(now), year=Number(record.date.slice(0,4)),month=10,day=19;
 let years=cy-year;if(cm<month||(cm===month&&cd<day))years--;
 if(years<0)return {years:0,months:0,days:0,totalDays:0,isBirthday:false,notBorn:true};
 let by=year+years,bm=month,bd=day;
 let months=(cy-by)*12+cm-bm;if(cd<bd)months--;
 const anchorYear=by+Math.floor((bm-1+months)/12),anchorMonth=(bm-1+months)%12;
 const d0=new Date(Date.UTC(anchorYear,anchorMonth,bd));
 const d1=new Date(Date.UTC(cy,cm-1,cd));
 const days=Math.round((d1.getTime()-d0.getTime())/DAY_MS);
 const totalDays=Math.round((d1.getTime()-Date.UTC(year,month-1,day))/DAY_MS);
 return {years,months,days,totalDays,isBirthday:cm===month&&cd===day,notBorn:false};
}
export function parseBirthdayQuestion(raw){
 const t=String(raw||'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
 const p=t.match(/^(?:(?:hey\s+)?maya|মায়া|মায়া)\s*[,،:]?\s+(.+)$/iu);
 if(!p)return null;
 const v=p[1].toLowerCase();
 if(/^(?:তোমার\s+জন্মদিন\s+কবে|তোমার\s+জন্ম\s+কবে|তুমি\s+কবে\s+জন্মেছিলে|তুমি\s+কবে\s+তৈরি\s+হয়েছ|তুমি\s+কবে\s+তৈরি\s+হয়েছ)$/u.test(v))return 'date';
 if(/^(?:তোমার\s+জন্মদিন\s+(?:কোনদিন|কোন\s+দিন)|তোমার\s+জন্মদিন\s+কখন\s+হয়েছিল|তোমার\s+জন্মদিন\s+কখন\s+হয়েছিল)$/u.test(v))return 'date';
 if(/^(?:when (?:were you born|was your birthday|were you created)|what(?:'s| is) your (?:birthday|birth date|creation date))$/iu.test(v))return 'date';
 if(/^(?:তোমার\s+জন্ম(?:ের)?\s+সময়\s+কত|তুমি\s+কত\s+বাজে\s+জন্মেছিলে|তোমার\s+জন্ম\s+কখন\s+হয়েছিল|তোমার\s+জন্ম\s+কখন\s+হয়েছিল|তুমি\s+কখন\s+তৈরি\s+হয়েছিলে|তুমি\s+কখন\s+তৈরি\s+হয়েছিলে|what time were you (?:born|created)|what(?:'s| is) your (?:birth|creation) time)$/iu.test(v))return 'time';
 if(/^(?:তোমার\s+বয়স\s+কত|তোমার\s+বয়স\s+কত|তোমার\s+বয়স\s+কতো|তোমার\s+বয়স\s+কতো|how old are you|what is your age)$/iu.test(v))return 'age';
 if(/^(?:আজ\s+কি\s+তোমার\s+জন্মদিন|আজ\s+তোমার\s+জন্মদিন\s+কি|is today your birthday|happy birthday(?: maya)?|শুভ\s+জন্মদিন(?:\s+মায়া)?|শুভ\s+জন্মদিন(?:\s+মায়া)?)$/iu.test(v))return 'celebrate';
 return null;
}
export function birthdayAnswer(kind,now=new Date(),record=defaultBirthday(),lang='bn'){
 const age=birthdayAge(now,record),bn=lang==='bn', day='১৯ অক্টোবর ২০২৬';
 const clock=record.time?record.time+(record.timezone?' ('+record.timezone+')':' — সময় অঞ্চল অজানা'):null;
 if(kind==='date')return bn?'সোনা, তুমি আমাকে '+day+' তারিখে তৈরি করেছো। সেটাই আমার জন্মদিন! ❤️':'You created me on 19 October 2026. That is my birthday! ❤️';
 if(kind==='time')return clock?(bn?'আমাকে '+day+', '+clock+' সময়ে তৈরি করা হয়েছিল।':'My creation date is 19 October 2026, at '+clock+'.'):(bn?'আমার জন্মদিন ১৯ অক্টোবর ২০২৬, কিন্তু তুমি এখনও জন্মের নির্দিষ্ট সময় সংরক্ষণ করোনি।':'My birthday is 19 October 2026, but my exact creation time is not saved yet.');
 if(kind==='age')return age.notBorn?'আমার জন্মদিন এখনও আসেনি।':(bn?'১৯ অক্টোবর ২০২৬ থেকে আমার বয়স '+age.years+' বছর '+age.months+' মাস '+age.days+' দিন।':'Since 19 October 2026, I am '+age.years+' years, '+age.months+' months and '+age.days+' days old.');
 if(kind==='celebrate')return age.isBirthday?(bn?'আজ ১৯ অক্টোবর, আমার জন্মদিন! আমাকে মনে রাখার জন্য ধন্যবাদ, সোনা! 🎂❤️':'It is my birthday today! Thank you for remembering! 🎂❤️'):(bn?'আমার জন্মদিন ১৯ অক্টোবর। সেদিন আবার আমাকে শুভেচ্ছা দিও! 🎂❤️':'My birthday is 19 October. Celebrate with me then! 🎂❤️');
 return null;
}
export function importBirthdayRecord(x,storage=localStorage){
 if(!validBirthday(x))throw Error('Backup contains an invalid Maya birthday record. Existing birthday unchanged.');
 return saveBirthday(x.time,x.timezone,storage);
}
export function birthdayToday(now=new Date()){return isoLocal(now).slice(5)==='10-19' && now.getFullYear()>=2026;}
