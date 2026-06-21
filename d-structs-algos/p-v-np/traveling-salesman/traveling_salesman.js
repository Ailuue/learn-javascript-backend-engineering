function tsp(cities, paths, dist) {
  const perms = permutations(cities);
  for (const perm of perms) {
    let totalDist = 0;
    for (let i = 0; i < perm.length - 1; i++) {
      totalDist += paths[perm[i]][perm[i + 1]];
    }
    if (totalDist <= dist) {
      return true;
    }
  }
  return false;
}

function verifyTsp(paths, dist, actualPath) {
  let totalDist = 0;
  for (let i = 0; i < actualPath.length - 1; i++) {
    totalDist += paths[actualPath[i]][actualPath[i + 1]];
  }
  return totalDist <= dist;
}

function permutations(arr) {
  return helper([], [...arr], arr.length);
}

function helper(res, arr, n) {
  if (n === 1) {
    res.push([...arr]);
  } else {
    for (let i = 0; i < n; i++) {
      helper(res, arr, n - 1);
      if (n % 2 === 1) {
        [arr[n - 1], arr[i]] = [arr[i], arr[n - 1]];
      } else {
        [arr[0], arr[n - 1]] = [arr[n - 1], arr[0]];
      }
    }
  }
  return res;
}

module.exports = { tsp, verifyTsp, permutations };
