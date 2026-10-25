/* Explicit one-command screenshot parser. The actual capture implementation is
   in voice-media.js and Android MayaVoiceMedia; never observe arbitrary chat DOM. */
export const KEY='maya_voice_screenshot_enabled';
export function isScreenshotCommand(value){
 const s=String(value||'').normalize('NFKC').toLowerCase()
  .replace(/^(?:you|আপনি)\s*:\s*/u,'').replace(/^[“"‘«]+|[”"’»]+$/gu,'')
  .replace(/[.!?।]+$/gu,'').replace(/\s+/gu,' ').trim();
 const body=s.replace(/^(?:(?:hey maya|maya|মায়া|মায়া|মাইয়া|মাইয়া)[, ]+)/u,'').trim();
 return /^(?:take (?:a )?screenshot|capture (?:a )?screenshot|save (?:a )?screenshot|screenshot(?: now| dao| koro| দাও| করো| করে দাও| নাও| নেও| নিন)?|screen shot(?: dao| koro| দাও| করো| করে দাও| নাও)?|স্ক্রিনশট(?: নাও| নেও| নিন| তোলো| তুলো| করো| করে দাও| দাও| সেভ করো| নিয়ে দাও| নিয়ে নাও| নিয়ে গ্যালারিতে সেভ করো)?|স্ক্রিন শট(?: নাও| তোলো| করো| করে দাও| দাও)?|স্ক্রিনের ছবি(?: নাও| তোলো| তুলো| নিয়ে দাও| নিয়ে নাও)?|ছবি তোলো|স্ক্রিনের স্ক্রিনশট(?: নাও| তোলো| করো| করে দাও)?)$/u.test(body);
}
