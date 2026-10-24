/* Explicit one-command screenshot parser. The actual capture implementation is
   in voice-media.js and Android MayaVoiceMedia; never observe arbitrary chat DOM. */
export const KEY='maya_voice_screenshot_enabled';
export function isScreenshotCommand(value){
 const s=String(value||'').normalize('NFKC').toLowerCase()
  .replace(/^(?:you|আপনি)\s*:\s*/u,'').replace(/^[“"‘«]+|[”"’»]+$/gu,'')
  .replace(/[.!?।]+$/gu,'').replace(/\s+/gu,' ').trim();
 return /^(?:(?:hey maya|maya|মায়া|মায়া|মাইয়া|মাইয়া)[, ]+)?(?:take (?:a )?screenshot|capture (?:a )?screenshot|save (?:a )?screenshot|screenshot|screenshot now|screenshot (?:নাও|নেও|নিন)|স্ক্রিনশট (?:নাও|নেও|নিন|তোলো|তুলে দাও|নিয়ে দাও|নিয়ে দাও|সেভ করো|নিয়ে গ্যালারিতে সেভ করো|নিয়ে গ্যালারিতে সেভ করো))$/u.test(s);
}
