const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

router.post('/register', async (req,res)=>{
    const {email,name}=req.body;

    try{
        const user=await prisma.user.create({
            data:{
                email:email,
                name:name
            }
        })
        res.status(200).json({success:true,user})
    }
    catch(e){
        res.status(500).json({success:false,error:e.message})
    }
})

router.post('/login', async (req,res)=>{
    const {email}=req.body;
    
    try{
        const user=await prisma.user.findUnique({
            where:{email}
        })
        
        if(!user){
            return res.status(404).json({success:false,message:'User not found'})
        }
        
        res.status(200).json({success:true,user})
    }
    catch(e){
        res.status(500).json({success:false,error:e.message})
    }
})

module.exports = router;
