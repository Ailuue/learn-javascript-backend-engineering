function quickSort(nums, low, high) {
  if (low < high) {
    const pivotIndex = partition(nums, low, high);
    quickSort(nums, low, pivotIndex - 1);
    quickSort(nums, pivotIndex + 1, high);
  }
}

function partition(nums, low, high) {
  const pivot = nums[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (nums[j] < pivot) {
      i += 1;
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
  }
  [nums[i + 1], nums[high]] = [nums[high], nums[i + 1]];
  return i + 1;
}

module.exports = { quickSort, partition };
