\ Model facility
\ LP format - for model browsing. Use MPS format to capture full model detail.
Minimize
  12000 Open1 + 15000 Open2 + 17000 Open3 + 13000 Open4 + 16000 Open5
   + 4000 Trans1,1 + 2000 Trans1,2 + 3000 Trans1,3 + 2500 Trans1,4
   + 4500 Trans1,5 + 2500 Trans2,1 + 2600 Trans2,2 + 3400 Trans2,3
   + 3000 Trans2,4 + 4000 Trans2,5 + 1200 Trans3,1 + 1800 Trans3,2
   + 2600 Trans3,3 + 4100 Trans3,4 + 3000 Trans3,5 + 2200 Trans4,1
   + 2600 Trans4,2 + 3100 Trans4,3 + 3700 Trans4,4 + 3200 Trans4,5
Subject To
 Capacity1: - 20 Open1 + Trans1,1 + Trans2,1 + Trans3,1 + Trans4,1 <= 0
 Capacity2: - 22 Open2 + Trans1,2 + Trans2,2 + Trans3,2 + Trans4,2 <= 0
 Capacity3: - 17 Open3 + Trans1,3 + Trans2,3 + Trans3,3 + Trans4,3 <= 0
 Capacity4: - 19 Open4 + Trans1,4 + Trans2,4 + Trans3,4 + Trans4,4 <= 0
 Capacity5: - 18 Open5 + Trans1,5 + Trans2,5 + Trans3,5 + Trans4,5 <= 0
 Demand1: Trans1,1 + Trans1,2 + Trans1,3 + Trans1,4 + Trans1,5 = 15
 Demand2: Trans2,1 + Trans2,2 + Trans2,3 + Trans2,4 + Trans2,5 = 18
 Demand3: Trans3,1 + Trans3,2 + Trans3,3 + Trans3,4 + Trans3,5 = 14
 Demand4: Trans4,1 + Trans4,2 + Trans4,3 + Trans4,4 + Trans4,5 = 20
Bounds
Binaries
 Open1 Open2 Open3 Open4 Open5
End
