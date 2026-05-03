const fs = require('fs');
const d = JSON.parse(fs.readFileSync('my-project/data/products.json','utf8'));
const pretty = JSON.stringify(d, null, 2);
const inline = JSON.stringify(d);

fs.mkdirSync('my-project/public/data', { recursive: true });
fs.writeFileSync('my-project/public/data/products.json', pretty);
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/products.json', pretty);

const re = /(<script type="application\/json" id="site-data">)[\s\S]*?(<\/script>)/;
['my-project/public/index.html', 'index.html'].forEach(p => {
    let h = fs.readFileSync(p, 'utf8');
    h = h.replace(re, '$1\n' + inline + '\n$2');
    fs.writeFileSync(p, h);
    console.log('Updated', p);
});
console.log('Synced. Products:', d.products.length);
