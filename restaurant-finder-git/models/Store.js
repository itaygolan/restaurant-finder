// creating store model
// indexing always takes place in Schema
const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // built in ES6 promise
const slug = require('slugs'); // url friendly

// describing what the data will look like
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number, // long then lat
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  // brings virtuals if JSON or Object are being called from data
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define Index
storeSchema.index({    // tell what they want to index
  name: 'text',
  description: 'text', // text allows us to search
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
  if(!this.isModified('name')) { // if the store name has not been modified
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  // if stores have the same name, have it be link, link1, link2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if(storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } }},
    { $sort: { count: -1 }}
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([ // returns Promise for a many-stepped query
    // Look up stores and populate their reviews
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
    // filter for only items that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } }}, // reviews.1 means that there is a review with index 1 (meaning there are at least 2 reviews for that store)
    // Add the average reviews field
    { $project: {
        photo: '$$ROOT.photo', // use $$ROOT to get original documenet
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: { $avg: '$reviews.rating' } // does math for us. finds average of reviews.rating numbers
    }},
    // sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 }}, // highest to lowest
    // limit to at most 10
    { $limit: 10 }
  ]);
};

// find reviews where the stores._id == review.store
storeSchema.virtual('reviews', {
  // tell it to go off to Review model and query for it
  ref: 'Review', // what model to link
  localField: '_id', // which field on our store needs to match with foreignField
  foreignField: 'store' // which field on the review
})

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema); // store data will look like an object that storeSchema has outliend
