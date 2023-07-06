const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const User = require("./models/User");
const Post = require('./models/Post');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');
require("dotenv").config();
const uri = process.env.URI; 


const salt = bcrypt.genSaltSync(10);
const pkey = bcrypt.genSaltSync(10);


app.use(cors({credentials: true, origin: 'http://localhost:5173'}));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
mongoose.connect(uri);

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const user = await User.create({username, password:bcrypt.hashSync(password, salt)});
        res.send(user);
    } catch(error) {
        res.status(400).json(error);
    }
    
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if (!user){
        alert("wrong username");
    }
    const passcomp = bcrypt.compareSync(password, user.password);
    if (passcomp){
        jwt.sign({username, id:user._id}, pkey, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token).json({
                id:user._id,
                username,
            });
        });
    }else {
        res.status(400).json("Incorrect credentials");
    }
});

app.get("/profile", (req, res) => {
    const {token} = req.cookies;
    jwt.verify(token, pkey, {}, (err, info) => {
        if (err) throw err;
        res.json(info);
    });
});

app.post("/logout", (req, res) => {
    res.cookie('token', '').json("ok");
});

app.post('/post', async (req, res) => {
    
    const {token} = req.cookies;
    jwt.verify(token, pkey, {}, async (err, info) => {
        if (err) throw err;
        const {title, summary, content} = req.body;
        const post = await Post.create({title, summary, content, author:info.id});
        res.json(post);
    });
});

app.get('/post', async (req, res) => {
    const posts = await Post.find()
    .populate('author', ['username'])
    .sort({updatedAt: -1});
    res.json(posts);
});

app.get('/post/:id', async (req, res) => {
    const {id} = req.params;
    const post = await Post.findById(id).populate('author', ['username']);
    res.json(post);
});

app.put('/post/:id', async (req, res) => {
    const {id} = req.params;
    const {token} = req.cookies;
    jwt.verify(token, pkey, {}, async (err, info) => {
        if (err) throw err;
        const {title, summary, content} = req.body;
        const post = await Post.findById(id);
        const isAuthor = JSON.stringify(post.author) === JSON.stringify(info.id);
        if (!isAuthor){
            return res.status(400).json("not the same author");
        }
        post.title = title;
        post.summary = summary;
        post.content =  content;
        await post.save();
        res.json(post);
    });
});

app.listen(4000);