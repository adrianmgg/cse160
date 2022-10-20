
# 4x4 matrix of vars for wolfram alpha
"{$($(foreach($i in 1..4){"{$($(foreach($j in 1..4){"a_$i$j"})-join', ')}"})-join', ')}" | Set-Clipboard


# Mat4.of
$rowmajor = foreach($a in 1..4){foreach($b in 1..4){ "a$($a)$($b)" }}
$colmajor = foreach($a in 1..4){foreach($b in 1..4){ "a$($b)$($a)" }}
($rowmajor | %{ "a[$($colmajor.IndexOf($_))]" }) -join ', '

# Mat4.multiply
$matsize = 4
function colmajoridx($i, $j) { "$(($i-1)+(($j-1)*$matsize))".PadLeft(2,' ') }
$(foreach($i in 1..$matsize){$(foreach($j in 1..$matsize){ $(foreach($k in 1..$matsize){"a[$(colmajoridx $i $k)]*b[$(colmajoridx $k $j)]"}) -join '+' };'') -join ', '}) -join "`n"

# mat componentwise ops
function capitalize($s) { "$($s.substring(0,1).toupper())$($s.substring(1))" }
@(@('add','+'),@('sub', '-'),@('mul', '*'),@('div', '/')) | %{$name, $op = $_; @"
    /** @param {number} a @returns {Mat4x4} */
    componentwise$(capitalize $name)(a) {
        return new Mat4x4(this.data.map(v => v $op a));
    }
"@}

# Mat4x4 cofactorMatrix
# function det3($a,$b,$c,$d,$e,$f,$g,$h,$i){ "$a*$e*$i - $a*$f*$h - $b*$d*$i + $b*$f*$g + $c*$d*$h - $c*$e*$g" }
function det3($a,$b,$c,$d,$e,$f,$g,$h,$i){ "$a*($e*$i-$f*$h)-$b*$d*$i+$b*$f*$g+$c*($d*$h-$e*$g)" }
function det3_negated($a,$b,$c,$d,$e,$f,$g,$h,$i){"$a*($f*$h-$e*$i)+$b*$d*$i-$b*$f*$g+$c*($e*$g-$d*$h)"}
$(foreach($mrow in 1..4){ $(foreach($mcol in 1..4){
  # "a_$mrow$mcol"
  $det3mat = foreach($drow in 1..4|where {$_-ne$mrow}) { foreach($dcol in 1..4|where{$_-ne$mcol}) {
    "d[$(  "$(  ($drow-1) + (($dcol-1)*4)  )".PadLeft(2,' ')  )]"
  } }
  if(($mrow+$mcol)%2 -eq 0){det3 @det3mat}else{det3_negated @det3mat}
})-join', ' })-join",`n" | Set-Clipboard

# Mat4x4 transpose
$(foreach($mrow in 1..4){ $(foreach($mcol in 1..4){
  "this.get($($mcol-1),$($mrow-1))"
})-join', ' })-join",`n" | Set-Clipboard

# Vec methods
@(@('add','+'),@('sub', '-'),@('mul', '*'),@('div', '/')) | %{$name, $op = $_; @"
    /** @param {Vec | number} a @returns {Vec} */
    $name(a) {
        if(typeof a === 'number') return Vec.of(this.x $op a, this.y $op a, this.z $op a);
        else return Vec.of(this.x $op a.x, this.y $op a.y, this.z $op a.z);
    }
    /** @param {Vec} a @param {Vec | number} b @returns {Vec} */
    static $name(a, b) { return a.$name(b); }
"@} | Set-Clipboard

# Vec constants
([ordered]@{zero='0, 0, 0'; one='1, 1, 1'; up='0, 1, 0'; down='0, -1, 0'; right='1, 0, 0'; left='-1, 0, 0'; backwards='0, 0, 1'; forwards='0, 0, -1'}).GetEnumerator() | %{@"
    static $($_.name.toupper()) = Vec.of($($_.value));
"@} | Set-Clipboard

