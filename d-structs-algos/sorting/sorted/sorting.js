class Influencer {
  constructor(numSelfies, numBioLinks) {
    this.numSelfies = numSelfies;
    this.numBioLinks = numBioLinks;
  }

  toString() {
    return `(${this.numSelfies}, ${this.numBioLinks})`;
  }
}

function vanity(influencer) {
  return influencer.numBioLinks * 5 + influencer.numSelfies;
}

function vanitySort(influencers) {
  return [...influencers].sort((a, b) => vanity(a) - vanity(b));
}

module.exports = { Influencer, vanity, vanitySort };
