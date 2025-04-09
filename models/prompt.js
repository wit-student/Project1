const mongoose=require("mongoose")
const Schema=mongoose.Schema
const promptSchema=new Schema({
    prompt:String,
    info:String,
    created_at:{
        type:Date,
        default:Date.now
    },
    
   
})

const Prompt=mongoose.model("Prompt",promptSchema)

module.exports=Prompt;
