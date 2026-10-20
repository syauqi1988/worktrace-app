import { describe, expect, it } from 'vitest';
import { ageBucket, buildReport, csvCell, type ReportRecord } from './engine';
const record = (changes: Partial<ReportRecord> = {}): ReportRecord => ({ id:'1',number:'INV-1',date:'2026-01-01',due:'2026-01-31',paidDate:'',party:'Customer',status:'Unpaid',amount:0.1,tags:[],items:[],path:'/invoices/1',...changes });
describe('report calculations',()=>{
  it('sums money without binary rounding drift',()=>expect(buildReport({name:'Invoice Summary',ms:'',mode:'documents'},[record(),record({amount:0.2})],'','2026-12-31').total).toBe(0.3));
  it('uses inclusive date boundaries',()=>expect(buildReport({name:'',ms:''},[record(),record({date:'2025-12-31'})],'2026-01-01','2026-01-01').rows).toHaveLength(1));
  it('uses payment date for collections',()=>expect(buildReport({name:'',ms:'',paid:true},[record({status:'Paid',paidDate:'2026-02-01'})],'2026-02-01','2026-02-28').total).toBe(0.1));
  it('excludes collections with unknown payment dates even for all time',()=>expect(buildReport({name:'',ms:'',paid:true},[record({status:'Paid'})],'','2026-12-31').rows).toHaveLength(0));
  it('keeps payment after cutoff outstanding',()=>expect(buildReport({name:'',ms:'',mode:'aging'},[record({status:'Paid',paidDate:'2026-02-10'})],'','2026-02-01').total).toBe(0.1));
  it('does not invent a due date',()=>expect(ageBucket('','2026-02-01')).toBe(5));
  it('classifies aging boundaries',()=>expect([ageBucket('2026-02-01','2026-02-01'),ageBucket('2026-01-02','2026-02-01'),ageBucket('2026-01-01','2026-02-01')]).toEqual([0,1,2]));
  it('excludes internal transfers from cashflow',()=>expect(buildReport({name:'',ms:'',mode:'cashflow'},[record({kind:'money_in',amount:100}),record({kind:'money_out',amount:25}),record({kind:'transfer',amount:400})],'','2026-12-31').total).toBe(75));
  it('separates units when aggregating products',()=>expect(buildReport({name:'',ms:'',mode:'items'},[record({items:[{name:'Cable',uom:'m',qty:3,amount:6},{name:'Cable',uom:'roll',qty:1,amount:20}]})],'','2026-12-31').rows).toHaveLength(2));
  it('neutralizes spreadsheet formulas and quotes',()=>{expect(csvCell('=1+1')).toBe('"\'=1+1"');expect(csvCell('A"B')).toBe('"A""B"');});
});