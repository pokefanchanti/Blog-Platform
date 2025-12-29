require('dotenv').config();
const express = require('express');
const db = require('better-sqlite3')("blogdb.db");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
db.pragma("journal_mode=WAL");
const app = express();

//DB setup
const createTables = db.transaction(()=>{
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username STRING NOT NULL UNIQUE,
            password STRING NOT NULL
        )
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            createdDate TEXT,
            title STRING NOT NULL,
            body STRING NOT NULL,
            authorID INTEGER,
            FOREIGN KEY (authorID) REFERENCES users (id)
        )    
    `).run();
})


createTables();

//MIDDLEWARE

//set view engine
app.set('view engine','ejs'); 
//use static files like css from public folder
app.use(express.static('public'));
//parse the url data into the req body
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

//custom middleware
app.use((req,res,next)=>{
    res.locals.errors=[];

    //try to decode incoming cookie
    try{
        const decoded = jwt.verify(req.cookies.userCookie, process.env.JWTSECRET);
        req.user = decoded;
    }catch(err){
        req.user = false;
    }

    res.locals.user = req.user;
    // console.log(req.user);

    next();
})

//custom middleware function
function isLoggedIn(req, res, next){
    if(req.user){
        return next();
    }
    return res.redirect('/');
}

//ROUTING

app.get('/',(req,res)=>{
    if(req.user) res.render('dashboard');
    else res.render('home');
})

app.get('/about',(req,res)=>{
    res.render('about');
})

app.get('/signup',(req,res)=>{
    res.render('signup');    
})

app.get('/login',(req,res)=>{
    res.render("login");
})

app.get('/logout', (req,res)=>{
    res.clearCookie("userCookie");
    res.redirect('/');
})

app.get('/create-post', isLoggedIn, (req,res)=>{
    res.render('create-post');
})

app.get("/post/:id", (req,res)=>{
    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);

    if(!post) {
        return res.redirect("/");
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(post.authorID);

    res.render("single-post",{post, user});
})

app.post('/login',(req,res)=>{
    const errors=[];
    //check the type 
    if(typeof req.body.username !== "string") req.body.username = "";
    if(typeof req.body.password !== "string") req.body.password = "";   

    //trim
    req.body.username = req.body.username.trim();

    if(!req.body.username) errors.push("Invalid username/password");
    else if(!req.body.password) errors.push("Invalid username/password");

    if(errors.length){
        return res.render("login",{errors});
    }

    //check if entered username exists in database
    const checkUsernameResult = db.prepare("SELECT * FROM users WHERE USERNAME = ?").get(req.body.username);

    if(!checkUsernameResult){
        errors.push("Invalid username/password");
        return res.render('login', {errors}); 
    }

    //check if password is correct
    const matchOrNot = bcrypt.compareSync(req.body.password, checkUsernameResult.password);
    if(!matchOrNot){
        errors.push("Invalid username/password");
        return res.render('login', {errors}); 
    }
    
    //give them cookie
    const cookieValue = jwt.sign({
        exp: Math.floor(Date.now()/1000) + 60*60*24, 
        userId: checkUsernameResult.id, 
        username: checkUsernameResult.username
    },process.env.JWTSECRET); 

    res.cookie("userCookie", cookieValue, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 1000*60*60*24
    });

    //redirect
    res.redirect("/");
})

app.post('/register',(req,res)=>{
    const errors=[];
    //check the type 
    if(typeof req.body.username !== "string") req.body.username = "";
    if(typeof req.body.password !== "string") req.body.password = "";   

    //trim
    req.body.username = req.body.username.trim();

    //validate username
    if(!req.body.username) errors.push("Provide a username first!");
    else if(req.body.username && req.body.username.length<3) errors.push("Username must be longer than 3 characters!");
    else if(req.body.username && req.body.username.length>30) errors.push("Username must be shorter than 30 characters!");
    else if(req.body.username && !req.body.username.match(/^[a-zA-Z0-9]+$/)) errors.push("Username can only contain alphanumeric characters!");
    //validate password
    else if(!req.body.password) errors.push("Provide a password first!");
    else if(req.body.password && req.body.password.length<3) errors.push("Password must be longer than 3 characters!");  
    else if(req.body.password && req.body.password.length>69) errors.push("Password must be shorter than 69 characters!");

    if(errors.length){
        return res.render("signup",{errors});
    }
    
    //save user data to db
    //hash password
    const salt = bcrypt.genSaltSync(10);
    req.body.password = bcrypt.hashSync(req.body.password, salt);

    //check if username is available
    const checkUsernameResult = db.prepare("SELECT * FROM users WHERE USERNAME = ?").get(req.body.username);

    if(checkUsernameResult){
        errors.push("Username is taken");
        return res.render('signup',{errors});
    }

    //add new user details into database
    const saveDataStatementResult = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(req.body.username, req.body.password);

    //get latest user ROWID
    const ourUser = db.prepare("SELECT * FROM users WHERE ROWID = ?").get(saveDataStatementResult.lastInsertRowid);
    
    //log user in by giving them cookie
    const cookieValue = jwt.sign({
        exp: Math.floor(Date.now()/1000) + 60*60*24, 
        userId: ourUser.id, 
        username: ourUser.username
    },process.env.JWTSECRET); 

    res.cookie("userCookie", cookieValue, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 1000*60*60*24
    });

    //redirect
    res.redirect("/");
})

app.post('/create-post', isLoggedIn, (req,res)=>{
    // console.log(req.body);

    const errors=[];
    req.body.title = req.body.title.trim();

    if(!req.body.title) errors.push("Add something before saving..");
    else if(!req.body.body) errors.push("Add something before saving..");

    if(errors.length){
        return res.render("create-post",{errors});
    }

    //formatted date
    const now = new Date();
    const day = String(now.getDate()).padStart(2,'0');
    const month =String(now.getMonth()+1).padStart(2,'0');
    const year =now.getFullYear();

    const date = `${day}/${month}/${year}`;
    console.log(date);

    //save to database
    const addPostResult = db.prepare("INSERT INTO posts (createdDate, title, body, authorID) VALUES (?, ?, ?, ?)").run(date, req.body.title, req.body.body, req.user.userId);

    //lookup the recently added post
    const recentPost = db.prepare("SELECT * FROM posts WHERE ROWID = ?").get(addPostResult.lastInsertRowid);

    //redirect
    res.redirect(`/post/${recentPost.id}`);
})

app.listen(8080, ()=>console.log("http://localhost:8080"));