const empty = v => v === null || v === undefined || String(v).trim() === '';
function inferType(column) {
  const c=column.toLowerCase().replace(/[^a-z]/g,'');
  if(c.includes('email')) return 'email';
  if(['age','amount','price','salary','quantity','score'].some(x=>c.includes(x))) return 'number';
  if(c.includes('date') || c.endsWith('dob')) return 'date';
  if(c.includes('phone') || c.includes('mobile') || c.includes('contact')) return 'phone';
  return null;
}
function validType(v,t) {
  if(t==='number') return v!=='' && Number.isFinite(Number(v));
  if(t==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if(t==='date') return !Number.isNaN(Date.parse(v));
  if(t==='phone') return /^\+?[0-9\s()-]{7,18}$/.test(v);
  return true;
}
export function validateRows(records,columns,rules={}) {
  const issues=[], seen=new Map(), invalid=new Set();
  records.forEach((record,index)=>{
    const row=index+2, normalized=columns.map(c=>String(record[c]??'').trim()).join('\u001f');
    if(seen.has(normalized)){issues.push({row,column:columns[0]||'(row)',value:String(record[columns[0]]??''),rule:'Duplicate row',message:`Duplicate of CSV row ${seen.get(normalized)}.`});invalid.add(row);} else seen.set(normalized,row);
    for(const column of columns){
      const raw=record[column]??'', value=String(raw).trim(), rule=rules[column]||{};
      const add=(name,message)=>{issues.push({row,column,value:String(raw),rule:name,message});invalid.add(row);};
      if(empty(value)){add('Missing value',`The "${column}" field is empty.`);continue;}
      const type=rule.type&&rule.type!=='auto'?rule.type:inferType(column);
      if(type&&!validType(value,type)){add(`Invalid ${type}`,`"${value}" is not a valid ${type} value.`);continue;}
      if(type==='number'&&rule.min!==''&&rule.min!==undefined&&Number(value)<Number(rule.min))add('Below minimum',`Value must be at least ${rule.min}.`);
      if(type==='number'&&rule.max!==''&&rule.max!==undefined&&Number(value)>Number(rule.max))add('Above maximum',`Value must be no more than ${rule.max}.`);
    }
  });
  const cells=Math.max(records.length*columns.length,1);
  return {totalRows:records.length,totalColumns:columns.length,validRows:records.length-invalid.size,invalidRows:invalid.size,totalIssues:issues.length,qualityScore:Math.max(0,Math.round((1-issues.length/cells)*100)),columns,issues};
}
