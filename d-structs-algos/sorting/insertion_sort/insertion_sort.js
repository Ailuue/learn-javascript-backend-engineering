function insertionSort(nums) {
  for (let i = 1; i < nums.length; i++) {
    let j = i;
    while (j > 0 && nums[j - 1] > nums[j]) {
      [nums[j], nums[j - 1]] = [nums[j - 1], nums[j]];
      j -= 1;
    }
  }
  return nums;
}

module.exports = { insertionSort };
