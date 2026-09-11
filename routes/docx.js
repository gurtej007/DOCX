const express = require('express');
const router = express.Router();
const { PrismaClient, Role } = require('../generated/prisma');
const { documentState, broadcastAll } = require('./op.js');
const authMiddleware = require('../middleware/auth_middleware');

const prisma = new PrismaClient();

router.post('/create', authMiddleware, async (req,res)=>{
    const {title, content} = req.body;
    
    try{
        const doc=await prisma.doc.create({
            data:{
                title,
                content
            }
        })
        await prisma.docAccess.create({
            data:{
                role:Role.OWNER,
                docId:doc.id,
                userId:req.userId
            }
        })
        
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.get('/', authMiddleware, async (req,res)=>{
    try{
        const docAccess=await prisma.docAccess.findMany({
            where:{userId:req.userId},
            include:{
                doc:true
            }
        })
        const docs = docAccess.map(access => ({
            ...access.doc,
            role: access.role
        }))
        res.status(200).json({success:true,docs})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.get('/:id', authMiddleware, async (req,res)=>{
    const {id}=req.params;
    const userId=req.userId;
    try{
        const doc=await prisma.doc.findUnique({
            where:{id}
        })
        if(!doc){
            return res.status(404).json({success:false,message:'Document not found'})
        }
        const access=await prisma.docAccess.findUnique({
            where:{
                docId_userId:{
                    docId:id,
                    userId:userId
                }
            }
        })
        if(!access){
            return res.status(403).json({success:false,message:'You are not allowed to access this document'})
        }
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.delete('/delete/:id', authMiddleware, async (req,res)=>{
    const {id}=req.params;
    try{
        const access=await prisma.docAccess.findUnique({
            where:{
                docId_userId:{
                    docId:id,
                    userId:req.userId
                }
            }
        })
        if(!access || access.role!==Role.OWNER){
            return res.status(403).json({success:false,message:'You are not allowed to delete this document'})
        }
        const doc=await prisma.doc.delete({
            where:{id}
        })
        res.status(200).json({success:true,doc})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.put('/update/:id', authMiddleware, async (req,res)=>{
    const {id}=req.params;
    const {title}=req.body;
    try{
        const access=await prisma.docAccess.findUnique({
            where:{
                docId_userId:{
                    docId:id,
                    userId:req.userId
                }
            }
        })
        if(!access || access.role!==Role.OWNER){
            return res.status(403).json({success:false,message:'You are not allowed to update this document'})
        }
        const doc=await prisma.doc.update({
            where:{id},
            data:{title}
        })
        
        if(documentState.has(id)){
            const state = documentState.get(id);
            documentState.set(id, {
                ...state,
                title: title
            });
            
            broadcastAll(id, null, {
                type: 'titleUpdate',
                title: title
            });
        }
        
        res.status(200).json({success:true,doc})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.post('/share', authMiddleware, async (req,res)=>{
    const {docId, email, role}=req.body;
    try{
        const access=await prisma.docAccess.findUnique({
            where:{
                docId_userId:{
                    docId:docId,
                    userId:req.userId
                }
            }
        })
        if(!access || access.role!==Role.OWNER){
            return res.status(403).json({success:false,message:'You are not allowed to share this document'})
        }
        const user=await prisma.user.findUnique({
            where:{email}
        })
        if(!user){
            return res.status(404).json({success:false,message:'User not found'})
        }
        const docAccess=await prisma.docAccess.create({
            data:{
                role,
                docId,
                userId:user.id
            }
        })
        res.status(200).json({success:true,docAccess})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
module.exports = router;