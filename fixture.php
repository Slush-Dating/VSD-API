<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$max = [1];
$min = [2];

$user = array_merge($max, $min);
$string = join(', ', $user);
echo "User list: " . $string . "<br/><br/>";
$string = join(', ', $max);
echo "Male list: " . $string . "<br/>";
$string = join(', ', $min);
echo "Female list: " . $string . "<br/><br/>";

if (count($max) == count($min)) {
    $j = -1;
    for ($r = 0; $r < count($max); $r++) {
        $pair = array();
        $j++;
        print "<br/>Round:" . $r . " -> ";
        for ($i = 0; $i < count($max); $i++) {
            $ps = ($max[$j] . "," . $min[$i]);
            array_push($pair, $ps);
            $j++;
            if ($j == count($min)) {
                $j = 0;
            }
        }

        $row = "";
        for ($k = 0; $k < count($user); $k++) {
            $p = "";
            for ($l = 0; $l < count($pair); $l++) {
                if (str_contains($pair[$l], $user[$k])) {
                    $p = $pair[$l];
                }
            }
            if ($p == "") {
                $row .= "BY, ";
            } else {
                $row .= "[" . $p . "]" . ", ";
            }
        }
        print $row;
    }
} else {
    $j = 0;
    for ($r = 0; $r < count($max); $r++) {
        $pair = array();

        if (count($min) % 2 == 0 && count($max) % 2 == 0) {
            $j++;
            if ($j == count($max)) {
                $j = 0;
            }
        }

        print "<br/>Round:" . $r . " -> ";
        
        for ($i = 0; $i < count($min); $i++) {
            $ps = "[" . ($max[$j] . "," . $min[$i]) . "]";
            array_push($pair, $ps);
            $j++;
            if ($j == count($max)) {
                $j = 0;
            }
        }

        $row = "";
        for ($k = 0; $k < count($user); $k++) {
            $p = "";
            for ($l = 0; $l < count($pair); $l++) {
                if (str_contains($pair[$l], ("[" . $user[$k] . ",")) || str_contains($pair[$l], "," . ($user[$k] . "]"))) {
                    $p = $pair[$l];
                }
            }
            if ($p == "") {
                $row .= "BY, ";
            } else {
                $row .= $p . ", ";
            }
        }
        
        print $row;
    }
}
