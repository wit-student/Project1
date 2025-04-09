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

const check = async () => {
  try {
      // ✅ 1. Create & Save a New User
      let user = new User({
          username: "rani",
          password: "rani",
          email: "rani@gmail.com",
      });

      await user.save(); // ✅ Save User in DB
      console.log("User saved:", user);

      // ✅ 2. Create & Save a New Prompt
      const newPrompt = new Prompt({
          prompt: "ai", // User input prompt
          info: "AI-generated response here", // Replace with AI response
      });

      await newPrompt.save(); // ✅ Save Prompt in DB
      console.log("Prompt saved:", newPrompt);

      // ✅ 3. Link Prompt to User
      user.prompts.push(newPrompt._id); // Store only ObjectId
      await user.save(); // ✅ Save the updated User document

      console.log("Prompt linked to User:", user);
  } catch (err) {
      console.error("Error in check():", err);
  }
};

  //check();