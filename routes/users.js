var express = require('express');
var router = express.Router();
const userModel =require('../models/userModel');
const bcrypt =require('bcrypt');
const jwt = require('jsonwebtoken')
const { Router } = require('express');
const productModel =require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const async = require('hbs/lib/async');
const cartModel = require('../models/cartModel');
const addressModel = require('../models/addressModel')
const { findOne } = require('../models/userModel');
const verifytokenAndAuthorization = require('../controller/verifyToken');






//========================================== //

// ============ LOGOUT =====================//


router.route('/logout').get(verifytokenAndAuthorization,(req,res)=>{
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
}).redirect('/');
})



// =======================================//




// ============= Home page ================== ///////////
router.route('/').get(verifytokenAndAuthorization,async(req,res)=>{
  console.log(req.user.user._id);
  const user =await userModel.findById(req.user.user._id,{password:0}).lean()
  
  const products=await productModel.find().populate('category').lean()
  const cart = await cartModel.findOne({userId:req.user.user._id}).lean().populate({path:'products',populate:'product'})
  const category= await categoryModel.find().lean()
  res.render('Users/usersHome',{products,category,user,cart})
})
//  ======================================////////

// ======= profile =========//

router.route('/address').get(verifytokenAndAuthorization,verifytokenAndAuthorization,async(req,res)=>{
  const address = await addressModel.findOne({userId:req.user.user._id}).lean()
  res.render('Users/profile/address',{layout:'adminlayout',address})
})

//  ======== address ============///

router.route('/address').post(verifytokenAndAuthorization,async(req,res)=>{
  const oldAddress =await addressModel.findOne({userId:req.user.user._id})
  const addresses = {
    address:req.body.address,
    state:req.body.state,
    city:req.body.city,
    pin:req.body.pin,
    contact:req.body.contact
  }
  if(oldAddress){
    await addressModel.findByIdAndUpdate(oldAddress._id,{$push:{addresses}})
    res.redirect(`/checkOut`);

  }else{
    const newAddress = await new addressModel({userId:req.user.user._id,addresses})
    newAddress.save() 
   
    res.redirect(`/checkOut`);

  }
})
router.route('/address/:addId').get(verifytokenAndAuthorization,async(req,res)=>{
  const ALLaddress = await addressModel.findOne({userId:req.user.user._id})
  const address = ALLaddress.addresses.filter(e=>e._id == req.params.addId)
  res.json({address})

}).post(verifytokenAndAuthorization,async(req,res)=>{
const address =await addressModel.updateOne({'addresses._id':req.params.addId},{$set:{'addresses.$':req.body}})
res.redirect(`/address`)
}).delete(async(req,res)=>{
  const address = await addressModel.findOneAndUpdate({userId:req.user.user._id},{$pull:{addresses:{_id:req.params.addId}}})
  console.log(address)
  res.json({status:"success"})
})





// ======== product ================//
router.route('/products/:proid').get(verifytokenAndAuthorization,async(req,res)=>{
  const product= await productModel.findById(req.params.proid);
  res.json({product})
})

//==================== CART ======================//

router.route('/cart')
.get(verifytokenAndAuthorization, async(req,res)=>{
  const cart= await cartModel.findOne({userId:req.user.user._id}).populate({path:'products',populate:{path:'product'}}).lean()
const user= await userModel.findById(req.user.user._id).lean()
  res.render('Users/cart',{cart,user})
})

  .post(verifytokenAndAuthorization,  async(req,res)=>{
    console.log(req.body)
    const discountPrice = await productModel.findById(req.body.prodId,{product:{discountPrice:1}})
    const totalPrice= (discountPrice.product.discountPrice*1)*req.body.qty
    const oldCart =await cartModel.findOne({userId:req.user.user._id})
    if(oldCart){
const finalPrice= oldCart.products.reduce((acc,crr)=>{
  return acc+crr.price
},0)
      const oldProduct= await cartModel.findOne({'products.product':req.body.prodId})
      console.log(oldProduct)

      if(oldProduct){

        const cart= await cartModel.updateOne({'products.product':req.body.prodId},{'$inc':{'products.$.qty':req.body.qty,'products.$.price':totalPrice}})
        await cartModel.findByIdAndUpdate(oldCart._id,{$inc:{totalPrice}})
        console.log(cart)
      

      }else{
        console.log("else case")
        const products={
            product:req.body.prodId,
            qty:req.body.qty,
          price:totalPrice}
          const cart = await cartModel.findByIdAndUpdate(oldCart._id,{$push:{products:products},$inc:{totalPrice}})
        }
    }else{
      const products={
        product:req.body.prodId,
        qty:req.body.qty,
      price:totalPrice}

      const cart = await new cartModel({userId:req.user.user._id,products,totalPrice})
      cart.save()
      console.log(cart)
    }
      res.json({status:"success"})
  })
// =============== check Out ===========//

router.route('/checkout').get(verifytokenAndAuthorization,async(req,res)=>{
  const cart= await cartModel.findOne({userId:req.user.user._id}).populate({path:'products',populate:{path:'product'}}).lean()
  const user= await userModel.findById(req.user.user._id).lean()
    res.render('Users/checkOut',{cart,user})
})



module.exports = router;
