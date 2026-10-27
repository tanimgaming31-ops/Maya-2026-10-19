package com.tanim.maya;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import org.json.JSONObject;
import org.json.JSONArray;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.google.mlkit.vision.text.TextRecognizer;

/** Explicit single-frame QR/barcode & receipt OCR.
 * Image remains on device; never scans in background, opens decoded links,
 * or automatically writes expenses. Polling never reveals an old result.
 */
public final class MayaVisualScan {
  private MayaVisualScan() {}
  private static int sequence=0;
  private static String state="idle",note="No scan started.",value="",format="",recognized="";
  private static JSONObject statusObject(){
    JSONObject o=new JSONObject();
    try{
      o.put("status",state);o.put("message",note);
      o.put("value",value);o.put("format",format);o.put("text",recognized);
      o.put("requestId",sequence);
    }catch(Exception ignored){}
    return o;
  }
  public static synchronized String result(){return statusObject().toString();}
  private static synchronized void finish(int id,String outcome,String detail,String decoded,String kind,String text){
    if(sequence!=id||!"pending".equals(state))return;
    state=outcome;note=detail;value=decoded;format=kind;recognized=text;
  }
  public static synchronized String cancel(){
    sequence++;state="cancelled";note="Scan cancelled.";value="";format="";recognized="";
    return result();
  }
  public static synchronized String scan(String action,String data){
    if("SCAN_RESULT".equals(action))return result();
    if("SCAN_CANCEL".equals(action))return cancel();
    if(!"SCAN_BARCODE".equals(action)&&!"SCAN_RECEIPT".equals(action))
      return error("Unsupported scan action.");
    if("pending".equals(state))return error("A scan is already running.");
    if(data==null||data.length()<100||data.length()>1800000)
      return error("Select a valid image smaller than 1.3 MB.");
    final byte[] bytes;
    try{
      String payload=data.startsWith("data:")?data.substring(data.indexOf(',')+1):data;
      bytes=Base64.decode(payload,Base64.DEFAULT);
      if(bytes.length<100||bytes.length>1350000)return error("Image is too large.");
    }catch(Exception ex){return error("Image data could not be decoded.");}
    final Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length);
    if(bitmap==null)return error("Image format not supported.");
    if(bitmap.getWidth()>2200||bitmap.getHeight()>2200){
      bitmap.recycle();return error("Image resolution exceeds safety limit.");
    }
    final InputImage img=InputImage.fromBitmap(bitmap,0);
    final int request=++sequence;
    state="pending";note="Reading the selected image on device.";value="";format="";recognized="";
    if("SCAN_BARCODE".equals(action)){
      final BarcodeScanner scanner=BarcodeScanning.getClient();
      scanner.process(img).addOnSuccessListener(list->{
        if(list==null||list.isEmpty())finish(request,"not_found","No QR or barcode found.","","","");
        else{
          Barcode b=list.get(0);
          String v=b.getRawValue()==null?"":b.getRawValue();
          if(v.length()>1500)v=v.substring(0,1500);
          finish(request,"ok","Decoded QR/barcode on device.",v,String.valueOf(b.getFormat()),"");
        }
      }).addOnFailureListener(e->finish(request,"error","Barcode engine failed.","","",""))
        .addOnCompleteListener(t->{scanner.close();bitmap.recycle();});
    }else{
      final TextRecognizer reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
      reader.process(img).addOnSuccessListener(text->{
        String found=text==null?"":text.getText();
        if(found.length()>10000)found=found.substring(0,10000);
        finish(request,found.trim().isEmpty()?"not_found":"ok",found.trim().isEmpty()?"No Latin-script text found.":"Receipt text extracted locally.","","",found);
      }).addOnFailureListener(e->finish(request,"error","Receipt OCR engine failed.","","",""))
        .addOnCompleteListener(t->{reader.close();bitmap.recycle();});
    }
    return result();
  }
  private static String error(String desc){
    JSONObject o=new JSONObject();try{o.put("status","error");o.put("message",desc);}catch(Exception ignored){}
    return o.toString();
  }
}
