const mongoose=require("mongoose")
const Prompt=require("./prompt.js")
const Schema=mongoose.Schema

const userSchema=new Schema({
    
  username:String,
  password:String,
  email:String,
prompts:[
  {
    type:Schema.Types.ObjectId,
    ref:"Prompt"
  }
]
})

const User=mongoose.model("User",userSchema)

module.exports=User;

