import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

const host = document.querySelector('[data-qa="resume-photo-desktop"]');
const host2 = document.querySelector('[data-qa="resume-sidebar"]');

const finalHost = host || host2;

const shell = document.createElement("div");

if (finalHost) {
  finalHost.appendChild(shell);
  ReactDOM.createRoot(shell).render(<App />);
} else {
  document.body.prepend(shell);
  ReactDOM.createRoot(shell).render(<App />);
}
