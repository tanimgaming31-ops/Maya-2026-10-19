/* Maya Advanced loader.
   Add this line just before </body> in index.html to enable it:
   <script type="module" src="./maya-features/advanced-loader.js"></script>
*/

function createAdvancedButton() {
  if (document.getElementById("mayaAdvancedButton")) return;

  const button = document.createElement("button");
  button.id = "mayaAdvancedButton";
  button.textContent = "Advanced";
  button.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:88px",
    "z-index:99999",
    "padding:12px 18px",
    "border:0",
    "border-radius:999px",
    "background:#4f7cff",
    "color:#fff",
    "font-weight:700",
    "font-size:14px",
    "box-shadow:0 8px 24px rgba(0,0,0,.35)",
    "cursor:pointer"
  ].join(";");

  button.onclick = () => {
    window.open("./maya-features/advanced-panel.html", "_blank");
  };

  document.body.appendChild(button);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createAdvancedButton);
} else {
  createAdvancedButton();
}
