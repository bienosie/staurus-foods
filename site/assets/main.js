const buyerCommodity=new URLSearchParams(window.location.search).get('commodity');
const buyerSelect=document.querySelector('#buyer-form select[name="commodity"]');
if(buyerCommodity&&buyerSelect){
  const commodityLabels={hibiscus:'Dried hibiscus flowers',cashew:'Raw cashew nuts',cocoa:'Cocoa beans',sesame:'Sesame seeds',soya:'Soya beans'};
  if(commodityLabels[buyerCommodity]) buyerSelect.value=commodityLabels[buyerCommodity];
}
document.getElementById('menu')?.addEventListener('click',()=>{
  const nav=document.getElementById('navlinks');
  nav.classList.toggle('show');
  document.getElementById('menu').setAttribute('aria-expanded',nav.classList.contains('show'));
});
const buyerForm=document.getElementById('buyer-form');
if(buyerForm){
  const button=buyerForm.querySelector('button[type="submit"]');
  const status=document.getElementById('form-status');
  const timestamp=buyerForm.querySelector('[name="submitted_at"]');
  if(timestamp) timestamp.value=String(Math.floor(Date.now()/1000));
  buyerForm.addEventListener('submit', async (event)=>{
    event.preventDefault();
    if(!buyerForm.reportValidity()) return;
    const body=new URLSearchParams(new FormData(buyerForm));
    if(body.get('website')) return;
    button.disabled=true;
    status.textContent='Sending your enquiry securely...';
    status.setAttribute('aria-live','polite');
    try{
      const response=await fetch('api/enquiry.php',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:body.toString(),
        credentials:'same-origin',
        cache:'no-store'
      });
      const result=await response.json();
      if(!response.ok || !result.success) throw new Error(result.message||'Unable to send the enquiry.');
      status.textContent=result.message;
      buyerForm.reset();
      if(timestamp) timestamp.value=String(Math.floor(Date.now()/1000));
    }catch(err){
      status.textContent=(err?.message||'Unable to submit the enquiry.')+' Alternatively email info@staurusfoods.com directly.';
    }finally{button.disabled=false;}
  });
}
