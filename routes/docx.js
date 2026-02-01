const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

router.post('/create', async (req,res)=>{
    const {title, content}=req.body;
    console.log(title, content);
    try{
        const doc=await prisma.doc.create({
            data:{
                title,
                content
            }
        })
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.get('/:id', async (req,res)=>{
    const {id}=req.params;
    try{
        const doc=await prisma.doc.findUnique({
            where:{id}
        })
        if(!doc){
            return res.status(404).json({success:false,message:'Document not found'})
        }
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.delete('/delete/:id', async (req,res)=>{
    const {id}=req.params;
    try{
        const doc=await prisma.doc.delete({
            where:{id}
        })
        res.status(200).json({success:true,doc})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})



module.exports = router;