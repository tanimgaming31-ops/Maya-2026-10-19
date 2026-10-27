from pathlib import Path
java=Path('native-vision/MayaDocumentPdf.java').read_text()
installer=Path('scripts/install-smart-vision.py').read_text()
js=Path('maya-features/smart-vision-v169.js').read_text()
loader=Path('maya-features/advanced-loader.js').read_text()
assert 'Matrix transform=new Matrix()' in java
assert 'transform.setPolyToPoly(src,0,dst,0,4)' in java
assert 'PdfDocument' in java
assert 'MediaStore.Downloads.EXTERNAL_CONTENT_URI' in java
assert 'MediaStore.MediaColumns.IS_PENDING' in java
assert 'Environment.DIRECTORY_DOWNLOADS+"/Maya"' in java
assert 'Double.isFinite' in java
assert 'activity.hasWindowFocus()' in java
assert 'requestPermissions(' not in java
assert 'READ_EXTERNAL_STORAGE' not in java and 'MANAGE_EXTERNAL_STORAGE' not in java
assert 'public String documentPdf(' in installer
assert "import './smart-vision-v169.js'" in loader
assert "scanImage('receipt',chosen)" in js
assert "saveReceiptExpense(" in js
assert "confirm('Send only the extracted medicine label TEXT" in js
assert "confirm('Send this selected PHOTO to Google Gemini" in js
assert 'No files will be moved, renamed, or deleted' in js
assert 'createImageBitmap' in js
assert '__smartVision169' in js
print('Maya V169 native PDF + privacy + voice integration static checks passed (device testing still required).')
