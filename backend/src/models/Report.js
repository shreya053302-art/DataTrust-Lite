import mongoose from 'mongoose';
const IssueSchema = new mongoose.Schema({row:Number,column:String,value:String,rule:String,message:String},{_id:false});
const ReportSchema = new mongoose.Schema({fileName:{type:String,required:true},totalRows:Number,totalColumns:Number,validRows:Number,invalidRows:Number,totalIssues:Number,qualityScore:Number,columns:[String],issues:[IssueSchema],rules:{type:mongoose.Schema.Types.Mixed,default:{}}},{timestamps:true});
export default mongoose.model('Report',ReportSchema);
