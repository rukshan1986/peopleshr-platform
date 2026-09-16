/* content.json with the strategy removed, for the roadmap-only hostname.

   On that hostname vercel.json redirects /content.json here, so the strategy
   half of the document never reaches the browser. Hiding a tab would not be
   enough on its own, because the data would still be one view-source away. */

const fs = require("fs/promises");
const path = require("path");

module.exports = async function handler(req, res){
  res.setHeader("Cache-Control", "no-cache, must-revalidate");

  let text = null;
  try {
    text = await fs.readFile(path.join(process.cwd(), "content.json"), "utf8");
  } catch(e){ /* falls back to the deployment's own copy below */ }

  if(text == null && process.env.VERCEL_URL){
    try {
      /* VERCEL_URL is this deployment's own hostname, which never matches the
         roadmap host, so this cannot redirect back into itself. */
      const r = await fetch("https://" + process.env.VERCEL_URL + "/content.json");
      if(r.ok) text = await r.text();
    } catch(e){}
  }

  if(text == null){
    res.status(502).json({ error: "Could not read the published content." });
    return;
  }

  let doc;
  try { doc = JSON.parse(text); }
  catch(e){
    res.status(502).json({ error: "The published content is not valid JSON." });
    return;
  }

  delete doc.strategy;
  /* Only capabilities explicitly marked public leave this endpoint. Anything
     without the flag stays behind, so a new or forgotten item is never exposed
     by accident. */
  if(Array.isArray(doc.items)) doc.items = doc.items.filter(function(i){ return i && i.pub === true; });
  doc.roadmapOnly = true;
  res.status(200).json(doc);
};
