
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
    /** @private */ static _$($_.name.toupper()) = Vec.of($($_.value));
    /** @returns {Vec} */ static $($_.name)() { return Vec._$($_.name.toupper()); }
"@} | Set-Clipboard

