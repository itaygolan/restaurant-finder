const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // you created a mongoose.model in Store.js with a name 'Store', so this is how you import it
const User = mongoose.model('User');
const multer = require('multer'); // handles image upload request
const jimp = require('jimp');
const uuid = require('uuid');


const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That file type isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index'); // renders index.pug file
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`; // makes every photo unique
  // resizing
  const photo = await jimp.read(req.file.buffer) // buffer is memory storage of photo
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once photo is written to filesystem, keep going
  next();
};

exports.createStore = async (req, res) => { // mark function with await
  req.body.author = req.user._id;
  // create new store using data from request of form
  // must save to mongoDB database using Async Await
  // wait for store to successfully save before going onto the next line
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}.`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  const storesPromise = Store
    // 1. Query the database for a list of all stores
    .find()
    // 2. Format stores on multiple pages
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit); // ciel allows for pages with < 4 if there are remainders
  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`)
    return;
  }
  // now give stores variable data to templace
  res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) { //store.author is the _id
    throw Error('You must own a store in order to edit it!');
  }
  // if they are keep going
};

exports.editStore = async (req, res) => {
  // 1. find the store given the ID
  const store = await Store.findOne({  _id: req.params.id });
  // 2. confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. render out the edit form so the user can edit their store
  res.render('editStore', {  title : `Edit ${store.name}`, store});

};

exports.updateStore =  async (req, res) => {
  // set location data to be a point
  req.body.location.type = 'Point';
  // find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true, // return the new strong instead of old one
      runValidators: true,
  }).exec(); // runs query
  // redirect them to store and tell them it worked
  req.flash('success', `Successfully updated <strong>${store.name}</store>.
    <a href = "/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!store) return next();
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true } // shows any store with a tag property
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]) // awaits both promises above
  res.render('tags', { tags, title: 'Tags', tag, stores });
};

// API

exports.searchStores = async (req, res) => {
  const stores = await Store
  // first find stores that match
  .find({
    $text: { // performs a text search on any field indexed with a text index
      $search: req.query.q // searching for what is in the query among all text indexed data
    }
  }, {
    score: { $meta: 'textScore' } // higher textScores = has more of q in the object
  })
  // then sort them
  .sort({
    score: { $meta: 'textScore' } // sorts by textScore (highest to lowest)
  });
  res.json(stores);

};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000
      }
    }
  }
  const stores = await Store.find(q).select('name description location photo slug');
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString()); // because hearts is an obj
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; // if store is already in hearts, remove it
  const user = await User.findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id }}, // [operator] syntax means it will be $pull or $addToSet depending on two lines before
      { new: true }
  );
  res.json(user);
};

exports.heartsPage = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts } // checks if a store's id is in req.user._id
  });
  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: '★ Top Stores ★' });
  // res.json(stores);
};
