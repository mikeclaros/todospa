import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// suppress console logs in prod
if(process.env.NODE_ENV !== 'development') {
  console.log = () => {}
} else {
  console.error('console log active!')
}

document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");
  const root = createRoot(appContainer);
  const data = appContainer.dataset;
  root.render(<App datas={data} />);
});
