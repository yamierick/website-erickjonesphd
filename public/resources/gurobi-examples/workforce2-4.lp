\ Model workforce2
\ LP format - for model browsing. Use MPS format to capture full model detail.
Minimize
  10 Amy.Mon1 + 10 Amy.Tue2 + 10 Amy.Wed3 + 10 Amy.Thu4 + 10 Amy.Fri5
   + 10 Amy.Sat6 + 10 Amy.Sun7 + 10 Amy.Mon8 + 10 Amy.Tue9 + 10 Amy.Wed10
   + 10 Amy.Thu11 + 10 Amy.Fri12 + 10 Amy.Sat13 + 10 Amy.Sun14
   + 12 Bob.Mon1 + 12 Bob.Tue2 + 12 Bob.Wed3 + 12 Bob.Thu4 + 12 Bob.Fri5
   + 12 Bob.Sat6 + 12 Bob.Sun7 + 12 Bob.Mon8 + 12 Bob.Tue9 + 12 Bob.Wed10
   + 12 Bob.Thu11 + 12 Bob.Fri12 + 12 Bob.Sat13 + 12 Bob.Sun14
   + 10 Cathy.Mon1 + 10 Cathy.Tue2 + 10 Cathy.Wed3 + 10 Cathy.Thu4
   + 10 Cathy.Fri5 + 10 Cathy.Sat6 + 10 Cathy.Sun7 + 10 Cathy.Mon8
   + 10 Cathy.Tue9 + 10 Cathy.Wed10 + 10 Cathy.Thu11 + 10 Cathy.Fri12
   + 10 Cathy.Sat13 + 10 Cathy.Sun14 + 8 Dan.Mon1 + 8 Dan.Tue2 + 8 Dan.Wed3
   + 8 Dan.Thu4 + 8 Dan.Fri5 + 8 Dan.Sat6 + 8 Dan.Sun7 + 8 Dan.Mon8
   + 8 Dan.Tue9 + 8 Dan.Wed10 + 8 Dan.Thu11 + 8 Dan.Fri12 + 8 Dan.Sat13
   + 8 Dan.Sun14 + 8 Ed.Mon1 + 8 Ed.Tue2 + 8 Ed.Wed3 + 8 Ed.Thu4
   + 8 Ed.Fri5 + 8 Ed.Sat6 + 8 Ed.Sun7 + 8 Ed.Mon8 + 8 Ed.Tue9 + 8 Ed.Wed10
   + 8 Ed.Thu11 + 8 Ed.Fri12 + 8 Ed.Sat13 + 8 Ed.Sun14 + 9 Fred.Mon1
   + 9 Fred.Tue2 + 9 Fred.Wed3 + 9 Fred.Thu4 + 9 Fred.Fri5 + 9 Fred.Sat6
   + 9 Fred.Sun7 + 9 Fred.Mon8 + 9 Fred.Tue9 + 9 Fred.Wed10 + 9 Fred.Thu11
   + 9 Fred.Fri12 + 9 Fred.Sat13 + 9 Fred.Sun14 + 11 Gu.Mon1 + 11 Gu.Tue2
   + 11 Gu.Wed3 + 11 Gu.Thu4 + 11 Gu.Fri5 + 11 Gu.Sat6 + 11 Gu.Sun7
   + 11 Gu.Mon8 + 11 Gu.Tue9 + 11 Gu.Wed10 + 11 Gu.Thu11 + 11 Gu.Fri12
   + 11 Gu.Sat13 + 11 Gu.Sun14
Subject To
 Mon1: Amy.Mon1 + Bob.Mon1 + Cathy.Mon1 + Dan.Mon1 + Ed.Mon1 + Fred.Mon1
   + Gu.Mon1 = 3
 Tue2: Amy.Tue2 + Bob.Tue2 + Cathy.Tue2 + Dan.Tue2 + Ed.Tue2 + Fred.Tue2
   + Gu.Tue2 = 2
 Wed3: Amy.Wed3 + Bob.Wed3 + Cathy.Wed3 + Dan.Wed3 + Ed.Wed3 + Fred.Wed3
   + Gu.Wed3 = 4
 Fri5: Amy.Fri5 + Bob.Fri5 + Cathy.Fri5 + Dan.Fri5 + Ed.Fri5 + Fred.Fri5
   + Gu.Fri5 = 5
 Mon8: Amy.Mon8 + Bob.Mon8 + Cathy.Mon8 + Dan.Mon8 + Ed.Mon8 + Fred.Mon8
   + Gu.Mon8 = 2
 Tue9: Amy.Tue9 + Bob.Tue9 + Cathy.Tue9 + Dan.Tue9 + Ed.Tue9 + Fred.Tue9
   + Gu.Tue9 = 2
 Wed10: Amy.Wed10 + Bob.Wed10 + Cathy.Wed10 + Dan.Wed10 + Ed.Wed10
   + Fred.Wed10 + Gu.Wed10 = 3
 Thu11: Amy.Thu11 + Bob.Thu11 + Cathy.Thu11 + Dan.Thu11 + Ed.Thu11
   + Fred.Thu11 + Gu.Thu11 = 4
 Sat13: Amy.Sat13 + Bob.Sat13 + Cathy.Sat13 + Dan.Sat13 + Ed.Sat13
   + Fred.Sat13 + Gu.Sat13 = 7
 Sun14: Amy.Sun14 + Bob.Sun14 + Cathy.Sun14 + Dan.Sun14 + Ed.Sun14
   + Fred.Sun14 + Gu.Sun14 = 5
Bounds
 Amy.Mon1 = 0
 Amy.Tue2 <= 1
 Amy.Wed3 <= 1
 Amy.Thu4 = 0
 Amy.Fri5 <= 1
 Amy.Sat6 = 0
 Amy.Sun7 <= 1
 Amy.Mon8 = 0
 Amy.Tue9 <= 1
 Amy.Wed10 <= 1
 Amy.Thu11 <= 1
 Amy.Fri12 <= 1
 Amy.Sat13 <= 1
 Amy.Sun14 <= 1
 Bob.Mon1 <= 1
 Bob.Tue2 <= 1
 Bob.Wed3 = 0
 Bob.Thu4 = 0
 Bob.Fri5 <= 1
 Bob.Sat6 <= 1
 Bob.Sun7 = 0
 Bob.Mon8 <= 1
 Bob.Tue9 = 0
 Bob.Wed10 = 0
 Bob.Thu11 <= 1
 Bob.Fri12 = 0
 Bob.Sat13 <= 1
 Bob.Sun14 = 0
 Cathy.Mon1 = 0
 Cathy.Tue2 = 0
 Cathy.Wed3 <= 1
 Cathy.Thu4 <= 1
 Cathy.Fri5 <= 1
 Cathy.Sat6 = 0
 Cathy.Sun7 <= 1
 Cathy.Mon8 <= 1
 Cathy.Tue9 <= 1
 Cathy.Wed10 <= 1
 Cathy.Thu11 <= 1
 Cathy.Fri12 <= 1
 Cathy.Sat13 <= 1
 Cathy.Sun14 <= 1
 Dan.Mon1 = 0
 Dan.Tue2 <= 1
 Dan.Wed3 <= 1
 Dan.Thu4 = 0
 Dan.Fri5 <= 1
 Dan.Sat6 <= 1
 Dan.Sun7 = 0
 Dan.Mon8 <= 1
 Dan.Tue9 <= 1
 Dan.Wed10 <= 1
 Dan.Thu11 <= 1
 Dan.Fri12 <= 1
 Dan.Sat13 <= 1
 Dan.Sun14 <= 1
 Ed.Mon1 <= 1
 Ed.Tue2 <= 1
 Ed.Wed3 <= 1
 Ed.Thu4 <= 1
 Ed.Fri5 <= 1
 Ed.Sat6 = 0
 Ed.Sun7 <= 1
 Ed.Mon8 <= 1
 Ed.Tue9 <= 1
 Ed.Wed10 = 0
 Ed.Thu11 <= 1
 Ed.Fri12 = 0
 Ed.Sat13 <= 1
 Ed.Sun14 <= 1
 Fred.Mon1 <= 1
 Fred.Tue2 <= 1
 Fred.Wed3 <= 1
 Fred.Thu4 = 0
 Fred.Fri5 = 0
 Fred.Sat6 <= 1
 Fred.Sun7 = 0
 Fred.Mon8 <= 1
 Fred.Tue9 <= 1
 Fred.Wed10 = 0
 Fred.Thu11 = 0
 Fred.Fri12 <= 1
 Fred.Sat13 <= 1
 Fred.Sun14 <= 1
 Gu.Mon1 <= 1
 Gu.Tue2 <= 1
 Gu.Wed3 <= 1
 Gu.Thu4 = 0
 Gu.Fri5 <= 1
 Gu.Sat6 <= 1
 Gu.Sun7 <= 1
 Gu.Mon8 <= 1
 Gu.Tue9 <= 1
 Gu.Wed10 <= 1
 Gu.Thu11 <= 1
 Gu.Fri12 <= 1
 Gu.Sat13 <= 1
 Gu.Sun14 <= 1
End
