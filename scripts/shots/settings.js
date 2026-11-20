document.getElementById('btn-settings').click();
const v=document.getElementById('set-volume'); v.value='0.35'; v.dispatchEvent(new Event('input'));
const m=document.getElementById('set-sens'); m.value='2.2'; m.dispatchEvent(new Event('input'));
location.reload();
setTimeout(()=>{},0);
