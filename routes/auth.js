const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const { genSalt, hash, compare } = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

router.post('/register', async (req,res)=>{
    const {email,password}=req.body;

    try{
        const salt=await genSalt(10);
        const hashedPassword=await hash(password,salt);
        const user=await prisma.user.create({
            data:{
                email:email,
                password:hashedPassword
            }
        })
        jwt.sign({userId:user.id, email:user.email},process.env.JWT_SECRET,{expiresIn:'1h'},(err,token)=>{
            if(err){
                return res.status(500).json({success:false,error:err.message})
            }
            res.status(200).json({success:true,user,token})
        })
    }
    catch(e){
        res.status(500).json({success:false,error:e.message})
    }
})

router.post('/login', async (req,res)=>{
    const {email, password}=req.body;
    
    try{
        const user=await prisma.user.findUnique({
            where:{email}
        })
        
        if(!user){
            return res.status(404).json({success:false,message:'User not found'})
        }

        const isMatch = await compare(password, user.password);
        if(!isMatch){
            return res.status(401).json({success:false,message:'Invalid password'})
        }
        jwt.sign({userId:user.id, email:user.email},process.env.JWT_SECRET,{expiresIn:'1h'},(err,token)=>{
            if(err){
                return res.status(500).json({success:false,error:err.message})
            }
            res.status(200).json({success:true,user,token})
        })
    }
    catch(e){
        res.status(500).json({success:false,error:e.message})
    }
})

module.exports = router;
