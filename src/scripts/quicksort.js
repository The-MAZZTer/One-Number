// Thanks Wikipedia editors for the nifty pseudocode!

function QuickSort(a, getKey) {
	 function partition(left, right, pivot) {
		var pivotKey = getKey(a, pivot);
		a.swapAt(right, pivot);
		var divider = left;
		for (var i = left; i < right; i++) {
			if (getKey(a, i) >= pivotKey) {
				continue;
			}
		
			a.swapAt(i, divider);
			divider++;
		}
	
		a.swapAt(divider, right);
		return divider;
	}

	function sort(left, right) {
		if (right <= left) {
			return;
		}
	
		var pivot = Math.round((left + right) / 2);
		pivot = partition(left, right, pivot);
		sort(left, pivot - 1);
		sort(pivot + 1, right);
	}

  sort(0, a.length - 1);
}