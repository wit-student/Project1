require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const express=require("express")
const app=express()
const path=require("path")
const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");
const cookieParser=require("cookie-parser")

const User=require("./models/User")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const session = require("express-session");
const flash = require("connect-flash");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

app.use(flash());

// Middleware to make flash messages available in views
app.use((req, res, next) => {
    res.locals.successMessage = req.flash("success")[0]||null;
    res.locals.errorMessage = req.flash("error")[0]|| null;
    next();
});
app.use(cookieParser())
app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs")
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, "public")));

const Prompt=require("./models/prompt")
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(`${process.env.MONGO_URI}/${process.env.MONGO_DB_NAME}`);

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



app.listen(8080,()=>{
    console.log("send message")
})

app.get("/home",(req,res)=>{
res.render("home.ejs")
})

app.get("/generate",(req,res)=>{
    let token = req.cookies.token;
    let userEmail = "";
    const theme = req.cookies.theme || "light-mode";
    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }

    res.render("index.ejs",{info:null,user:userEmail})
})



app.post("/generate",async(req,res)=>{
    console.log("something")
let {prompt}=req.body;
console.log(prompt)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
console.log("TEXT GENERATING")
const result = await model.generateContent(prompt);
console.log(result.response.text())
let info=result.response.text()
let formattedInfo = marked(info);



let token = req.cookies.token;
    let userEmail = "";

    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }

// ✅ Sanitize the HTML to prevent XSS attacks
formattedInfo = sanitizeHtml(formattedInfo, {
    allowedTags: [],
    allowedAttributes: {},
});


let user = await User.findOne({ email: userEmail });

if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/login");
}
const addinfo= new Prompt({
    prompt:prompt,info:formattedInfo,
 
})
 await addinfo.save()
 .then(res=>{
    console.log("info added in databases")
 })
 .catch(error=>{
    console.log(error)
 })
 user.prompts.push(addinfo._id);
 await user.save(); // ✅ Save updated user

 console.log("🟢 Updated User with Prompt:", user);

res.render("index.ejs", { info: formattedInfo,prompt ,user:userEmail});
// res.render("index.ejs",{ info:marked(info) })
})


app.get("/signup",(req,res)=>{
    res.render("signup.ejs");
})

app.post("/signup",async(req,res)=>{
let {username,password,email}=req.body;
const hashedPassword = await bcrypt.hash(password, 10);
const Users=new User({
    username:username,
    password:hashedPassword,
    email:email,
})
await Users.save()
req.flash("success","user is signed up!")
res.redirect("/generate")
})


app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            console.log("User not found");
         req.flash("error","Email or password is incorrect and user not exists");
         res.redirect("/login")
        }

        // ✅ Use `await` with `bcrypt.compare`
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        
        if (!isMatch) {
            console.log("Incorrect password");
            req.flash("error","Email or password is incorrect");
            res.redirect("/login")
        }

        // ✅ Generate JWT token
        let token = jwt.sign({ email: user.email }, "sssssss", { expiresIn: "1h" });

        // ✅ Set cookie with token
        res.cookie("token", token, { httpOnly: true });

        console.log("User logged in");
        console.log("Token:", token);

        // ✅ Redirect to the generate page
      
       
        req.flash("success","user is logged in");
        res.redirect("/generate");
    } catch (error) {
        console.log("Login error:", error);
        req.flash("error","error occurred")
    }
});


app.get("/logout",(req,res)=>{
  res.clearCookie("token")
    console.log("token=>")
    req.flash("error","User is logged out!")
    res.redirect("/generate")
})



app.all("/",(req,res,next)=>{
req.flash("error","Page not found")
next();
})


app.get("/cover-letter", (req, res) => {
    let token = req.cookies.token;
    let userEmail = "";

    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }
    res.render("coverLetter", { coverLetter: null,user:userEmail }); // Initially empty
});

// Route to generate the cover letter using Gemini AI
app.post("/generate-cover-letter", async (req, res) => {
    const { company, jobTitle, skills } = req.body;

    let token = req.cookies.token;
    let userEmail = "";

    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }
    // Gemini AI prompt
    const prompt = `Generate a professional cover letter for ${jobTitle} at ${company}. 
    Highlight skills: ${skills}. Keep it formal and engaging.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    
    let coverLetter = result.response.text();

    let user = await User.findOne({ email: userEmail });

    if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/login");
    }

    // Re-render the page with the generated cover letter
    let formattedInfo = marked(coverLetter);
    formattedInfo = sanitizeHtml(formattedInfo, {
        allowedTags: [],
        allowedAttributes: {},
    });
    res.render("coverLetter", { coverLetter:formattedInfo,user:userEmail });
});



app.get("/refferal-message", (req, res) => {
    let token = req.cookies.token;
    let userEmail = "";

    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }
    res.render("refferal.ejs", { RefferalMsg: null,user:userEmail }); // Initially empty
});

// Route to generate the cover refferalletter using Gemini AI
app.post("/generator-refferal-message", async (req, res) => {
    const { company, jobTitle, skills,experience } = req.body;

    let token = req.cookies.token;
    let userEmail = "";

    if (token) {
        try {
            let decoded = jwt.verify(token, "sssssss");
            userEmail = decoded.email;
        } catch (err) {
            console.log("JWT verification failed", err);
            return res.redirect("/login");
        }
    }
    
let user = await User.findOne({ email: userEmail });

if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/login");
}
    // Gemini AI prompt
    const prompt = `only  Generate a referral message for an employee at ${company}. My skills include ${skills}, and I have experience in ${experience}} job description${jobTitle}. The message should professionally request a referral and only generate message dont give extra information`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    
    let RefferalMsg = result.response.text();

    // Re-render the page with the generated refferalmesg
    let formattedInfo = marked(RefferalMsg);
    formattedInfo = sanitizeHtml(formattedInfo, {
        allowedTags: [],
        allowedAttributes: {},
    });
    res.render("refferal.ejs", { RefferalMsg:formattedInfo,user:userEmail });
});



app.get("/previous", async (req, res) => {
    try {
        let token = req.cookies.token;
        if (!token) {
            req.flash("error", "User not authenticated");
            return res.redirect("/login");
        }

        let decoded = jwt.verify(token, "sssssss");
        let userEmail = decoded.email;

        let user = await User.findOne({ email: userEmail });
        console.log(" User Before Populate:", user);

        if (!user) {
            req.flash("error", "User not found");
            return res.redirect("/login");
        }

        //  Populate Prompts
        user = await user.populate("prompts");
        console.log("User After Populate:", user);

        
        res.render("previous.ejs", { previous: user.prompts || [] ,user:userEmail });
    } catch (err) {
        console.error("Error fetching previous data:", err);
        req.flash("error", "Internal Server Error");
        res.redirect("/generate");
    }
});




