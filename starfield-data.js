(function(global){

  const STAR_CATALOG = [

    { id:'dubhe',    name:'Dubhe',     raH:11.0621, decDeg: 61.751, mag:1.79, con:'uma' },
    { id:'merak',    name:'Merak',     raH:11.0307, decDeg: 56.383, mag:2.37, con:'uma' },
    { id:'phecda',   name:'Phecda',    raH:11.8972, decDeg: 53.695, mag:2.44, con:'uma' },
    { id:'megrez',   name:'Megrez',    raH:12.2571, decDeg: 57.033, mag:3.32, con:'uma' },
    { id:'alioth',   name:'Alioth',    raH:12.9005, decDeg: 55.960, mag:1.77, con:'uma' },
    { id:'mizar',    name:'Mizar',     raH:13.3988, decDeg: 54.925, mag:2.23, con:'uma' },
    { id:'alkaid',   name:'Alkaid',    raH:13.7923, decDeg: 49.313, mag:1.86, con:'uma' },

    { id:'betelgeuse', name:'Betelgeuse', raH:5.9195, decDeg:  7.407, mag:0.50, con:'ori' },
    { id:'rigel',       name:'Rigel',       raH:5.2423, decDeg: -8.202, mag:0.13, con:'ori' },
    { id:'bellatrix',   name:'Bellatrix',   raH:5.4189, decDeg:  6.350, mag:1.64, con:'ori' },
    { id:'mintaka',     name:'Mintaka',     raH:5.5335, decDeg: -0.299, mag:2.23, con:'ori' },
    { id:'alnilam',     name:'Alnilam',     raH:5.6036, decDeg: -1.202, mag:1.69, con:'ori' },
    { id:'alnitak',     name:'Alnitak',     raH:5.6793, decDeg: -1.943, mag:1.88, con:'ori' },
    { id:'saiph',       name:'Saiph',       raH:5.7960, decDeg: -9.670, mag:2.09, con:'ori' },

    { id:'acrux',   name:'Acrux',   raH:12.4433, decDeg:-63.099, mag:0.77, con:'cru' },
    { id:'mimosa',  name:'Mimosa',  raH:12.7954, decDeg:-59.689, mag:1.25, con:'cru' },
    { id:'gacrux',  name:'Gacrux',  raH:12.5194, decDeg:-57.113, mag:1.63, con:'cru' },
    { id:'imai',    name:'Imai',    raH:12.2524, decDeg:-58.749, mag:2.79, con:'cru' },

    { id:'antares',   name:'Antares',   raH:16.4901, decDeg:-26.432, mag:0.96, con:'sco' },
    { id:'graffias',  name:'Graffias',  raH:16.0906, decDeg:-19.806, mag:2.56, con:'sco' },
    { id:'dschubba',  name:'Dschubba',  raH:16.0056, decDeg:-22.622, mag:2.29, con:'sco' },
    { id:'pisco',     name:'Pi Sco',    raH:15.9808, decDeg:-26.114, mag:2.89, con:'sco' },
    { id:'epssco',    name:'Epsilon Sco', raH:16.8361, decDeg:-34.293, mag:2.29, con:'sco' },
    { id:'tausco',    name:'Tau Sco',   raH:16.5981, decDeg:-28.216, mag:2.82, con:'sco' },
    { id:'shaula',    name:'Shaula',    raH:17.5601, decDeg:-37.104, mag:1.62, con:'sco' },
    { id:'lesath',    name:'Lesath',    raH:17.5128, decDeg:-37.296, mag:2.70, con:'sco' },
    { id:'kappasco',  name:'Kappa Sco', raH:17.7081, decDeg:-39.030, mag:2.41, con:'sco' },

    { id:'caph',    name:'Caph',    raH:0.1530, decDeg: 59.150, mag:2.28, con:'cas' },
    { id:'schedar', name:'Schedar', raH:0.6751, decDeg: 56.537, mag:2.24, con:'cas' },
    { id:'navi',    name:'Navi',    raH:0.9451, decDeg: 60.717, mag:2.47, con:'cas' },
    { id:'ruchbah', name:'Ruchbah', raH:1.4303, decDeg: 60.235, mag:2.68, con:'cas' },
    { id:'segin',   name:'Segin',   raH:1.9066, decDeg: 63.670, mag:3.35, con:'cas' },

    { id:'regulus',  name:'Regulus',  raH:10.1395, decDeg: 11.967, mag:1.35, con:'leo' },
    { id:'denebola', name:'Denebola', raH:11.8177, decDeg: 14.572, mag:2.14, con:'leo' },
    { id:'algieba',  name:'Algieba',  raH:10.3329, decDeg: 19.842, mag:2.08, con:'leo' },
    { id:'zosma',    name:'Zosma',    raH:11.2351, decDeg: 20.524, mag:2.56, con:'leo' },
    { id:'chertan',  name:'Chertan',  raH:11.2373, decDeg: 15.429, mag:3.34, con:'leo' },
    { id:'adhafera', name:'Adhafera', raH:10.2782, decDeg: 23.417, mag:3.44, con:'leo' },
    { id:'epsleo',   name:'Epsilon Leo', raH:9.7642, decDeg: 23.774, mag:2.98, con:'leo' },

    { id:'sirius',  name:'Sirius',  raH:6.7525, decDeg:-16.716, mag:-1.46, con:'cma' },
    { id:'mirzam',  name:'Mirzam',  raH:6.3783, decDeg:-17.956, mag:1.98, con:'cma' },
    { id:'wezen',   name:'Wezen',   raH:7.1398, decDeg:-26.393, mag:1.83, con:'cma' },
    { id:'adhara',  name:'Adhara',  raH:6.9771, decDeg:-28.972, mag:1.50, con:'cma' },
    { id:'aludra',  name:'Aludra',  raH:7.4016, decDeg:-29.303, mag:2.45, con:'cma' },

    { id:'deneb',   name:'Deneb',   raH:20.6905, decDeg: 45.280, mag:1.25, con:'cyg' },
    { id:'sadr',    name:'Sadr',    raH:20.3705, decDeg: 40.257, mag:2.23, con:'cyg' },
    { id:'gienah',  name:'Gienah',  raH:20.7702, decDeg: 33.970, mag:2.48, con:'cyg' },
    { id:'albireo', name:'Albireo', raH:19.5120, decDeg: 27.960, mag:3.18, con:'cyg' },
    { id:'deltacyg',name:'Delta Cyg', raH:19.7496, decDeg: 45.131, mag:2.87, con:'cyg' },

    { id:'aldebaran', name:'Aldebaran', raH:4.5987, decDeg: 16.509, mag:0.86, con:'tau' },
    { id:'elnath',    name:'Elnath',    raH:5.4382, decDeg: 28.608, mag:1.65, con:'tau' },
    { id:'alcyone',   name:'Alcyone',   raH:3.7914, decDeg: 24.105, mag:2.87, con:'tau' },
    { id:'zetatau',   name:'Zeta Tau',  raH:5.6274, decDeg: 21.143, mag:3.01, con:'tau' },

    { id:'castor',  name:'Castor',  raH:7.5766, decDeg: 31.888, mag:1.58, con:'gem' },
    { id:'pollux',  name:'Pollux',  raH:7.7553, decDeg: 28.026, mag:1.14, con:'gem' },
    { id:'alhena',  name:'Alhena',  raH:6.6285, decDeg: 16.399, mag:1.93, con:'gem' },
    { id:'wasat',   name:'Wasat',   raH:7.3354, decDeg: 21.982, mag:3.53, con:'gem' },
    { id:'mebsuta', name:'Mebsuta', raH:6.7322, decDeg: 25.131, mag:2.98, con:'gem' },

    { id:'kausaustralis', name:'Kaus Australis', raH:18.4029, decDeg:-34.384, mag:1.85, con:'sgr' },
    { id:'kausmedia',     name:'Kaus Media',     raH:18.3489, decDeg:-29.828, mag:2.72, con:'sgr' },
    { id:'kausborealis',  name:'Kaus Borealis',  raH:18.4694, decDeg:-25.421, mag:2.81, con:'sgr' },
    { id:'alnasl',        name:'Alnasl',         raH:18.0959, decDeg:-30.424, mag:2.99, con:'sgr' },
    { id:'nunki',         name:'Nunki',          raH:18.9210, decDeg:-26.297, mag:2.05, con:'sgr' },
    { id:'ascella',       name:'Ascella',        raH:19.0431, decDeg:-29.880, mag:2.60, con:'sgr' },
    { id:'phisgr',        name:'Phi Sgr',        raH:18.7597, decDeg:-26.990, mag:3.17, con:'sgr' },

    { id:'altair',   name:'Altair',    raH:19.8464, decDeg:  8.868, mag:0.76, con:'aql' },
    { id:'tarazed',  name:'Tarazed',   raH:19.7708, decDeg: 10.613, mag:2.72, con:'aql' },
    { id:'alshain',  name:'Alshain',   raH:19.9226, decDeg:  6.407, mag:3.71, con:'aql' },
    { id:'denebelokab', name:'Deneb el Okab', raH:19.0902, decDeg: 13.863, mag:2.99, con:'aql' },
    { id:'okab',     name:'Okab',      raH:20.1897, decDeg: -0.821, mag:3.23, con:'aql' },
    { id:'deltaaql', name:'Delta Aql', raH:19.4248, decDeg:  3.115, mag:3.36, con:'aql' },

    { id:'vega',    name:'Vega',      raH:18.6156, decDeg: 38.784, mag:0.03, con:'lyr' },
    { id:'sheliak', name:'Sheliak',   raH:18.8347, decDeg: 33.363, mag:3.52, con:'lyr' },
    { id:'sulafat', name:'Sulafat',   raH:18.9825, decDeg: 32.690, mag:3.24, con:'lyr' },
    { id:'delta2lyr', name:'Delta2 Lyr', raH:18.9016, decDeg: 36.899, mag:4.30, con:'lyr' },
    { id:'zeta1lyr',  name:'Zeta1 Lyr',  raH:18.7458, decDeg: 37.605, mag:4.34, con:'lyr' },

    { id:'arcturus', name:'Arcturus', raH:14.2611, decDeg: 19.183, mag:-0.05, con:'boo' },
    { id:'izar',     name:'Izar',     raH:14.7500, decDeg: 27.074, mag:2.37, con:'boo' },
    { id:'muphrid',  name:'Muphrid',  raH:13.9147, decDeg: 18.398, mag:2.68, con:'boo' },
    { id:'seginus',  name:'Seginus',  raH:14.5349, decDeg: 38.308, mag:3.03, con:'boo' },
    { id:'nekkar',   name:'Nekkar',   raH:15.0325, decDeg: 40.390, mag:3.50, con:'boo' },
    { id:'deltaboo', name:'Delta Boo', raH:15.2582, decDeg: 33.315, mag:3.48, con:'boo' },

    { id:'spica',       name:'Spica',       raH:13.4199, decDeg:-11.161, mag:0.98, con:'vir' },
    { id:'porrima',     name:'Porrima',     raH:12.6944, decDeg: -1.449, mag:2.74, con:'vir' },
    { id:'vindemiatrix',name:'Vindemiatrix',raH:13.0362, decDeg: 10.959, mag:2.83, con:'vir' },
    { id:'heze',        name:'Heze',        raH:13.5763, decDeg: -0.596, mag:3.37, con:'vir' },
    { id:'auva',        name:'Auva',        raH:12.9267, decDeg:  3.397, mag:3.38, con:'vir' },
    { id:'zavijava',    name:'Zavijava',    raH:11.8503, decDeg:  1.765, mag:3.60, con:'vir' },

    { id:'zubenelgenubi', name:'Zubenelgenubi', raH:14.8479, decDeg:-16.042, mag:2.75, con:'lib' },
    { id:'zubeneschamali',name:'Zubeneschamali',raH:15.2833, decDeg: -9.383, mag:2.61, con:'lib' },
    { id:'zubenelakrab',  name:'Zubenelakrab',  raH:15.5925, decDeg:-14.789, mag:3.91, con:'lib' },
    { id:'brachium',      name:'Brachium',      raH:15.0672, decDeg:-25.282, mag:3.29, con:'lib' },

    { id:'markab', name:'Markab', raH:23.0793, decDeg: 15.205, mag:2.49, con:'peg' },
    { id:'scheat', name:'Scheat', raH:23.0629, decDeg: 28.083, mag:2.42, con:'peg' },
    { id:'algenib',name:'Algenib',raH:0.2207,  decDeg: 15.184, mag:2.83, con:'peg' },
    { id:'enif',   name:'Enif',   raH:21.7364, decDeg:  9.875, mag:2.39, con:'peg' },
    { id:'homam',  name:'Homam',  raH:22.6910, decDeg: 10.831, mag:3.40, con:'peg' },
    { id:'matar',  name:'Matar',  raH:22.7167, decDeg: 30.221, mag:2.94, con:'peg' },

    { id:'alpheratz', name:'Alpheratz', raH:0.1398, decDeg: 29.091, mag:2.06, con:'and' },
    { id:'mirach',    name:'Mirach',    raH:1.1620, decDeg: 35.621, mag:2.05, con:'and' },
    { id:'almach',    name:'Almach',    raH:2.0649, decDeg: 42.330, mag:2.10, con:'and' },
    { id:'deltaand',  name:'Delta And', raH:0.6555, decDeg: 30.861, mag:3.27, con:'and' },

    { id:'mirfak', name:'Mirfak', raH:3.4054, decDeg: 49.861, mag:1.79, con:'per' },
    { id:'algol',  name:'Algol',  raH:3.1361, decDeg: 40.956, mag:2.09, con:'per' },
    { id:'miram',  name:'Miram',  raH:2.8433, decDeg: 55.896, mag:3.76, con:'per' },
    { id:'deltaper', name:'Delta Per', raH:3.7128, decDeg: 47.788, mag:3.01, con:'per' },
    { id:'epsilonper', name:'Epsilon Per', raH:3.9599, decDeg: 40.010, mag:2.89, con:'per' },
    { id:'gammaper', name:'Gamma Per', raH:3.0797, decDeg: 53.506, mag:2.93, con:'per' },

    { id:'capella',   name:'Capella',   raH:5.2782, decDeg: 45.998, mag:0.08, con:'aur' },
    { id:'menkalinan',name:'Menkalinan',raH:5.9922, decDeg: 44.947, mag:1.90, con:'aur' },
    { id:'mahasim',   name:'Mahasim',   raH:5.9956, decDeg: 37.213, mag:2.62, con:'aur' },
    { id:'hassaleh',  name:'Hassaleh',  raH:4.9497, decDeg: 33.166, mag:2.69, con:'aur' },

    { id:'procyon', name:'Procyon', raH:7.6550, decDeg:  5.225, mag:0.34, con:'cmi' },
    { id:'gomeisa', name:'Gomeisa', raH:7.4525, decDeg:  8.289, mag:2.90, con:'cmi' },

    { id:'hamal',    name:'Hamal',    raH:2.1195, decDeg: 23.462, mag:2.00, con:'ari' },
    { id:'sheratan', name:'Sheratan', raH:1.9107, decDeg: 20.808, mag:2.64, con:'ari' },
    { id:'mesarthim',name:'Mesarthim',raH:1.8863, decDeg: 19.294, mag:3.86, con:'ari' },

    { id:'algedi',       name:'Algedi',       raH:20.3097, decDeg:-12.545, mag:3.58, con:'cap' },
    { id:'dabih',        name:'Dabih',        raH:20.3502, decDeg:-14.781, mag:3.05, con:'cap' },
    { id:'nashira',      name:'Nashira',      raH:21.6664, decDeg:-16.662, mag:3.68, con:'cap' },
    { id:'denebalgedi',  name:'Deneb Algedi', raH:21.7844, decDeg:-16.127, mag:2.87, con:'cap' },
    { id:'zetacap',      name:'Zeta Cap',     raH:21.4423, decDeg:-22.412, mag:3.74, con:'cap' },

    { id:'sadalsuud', name:'Sadalsuud', raH:21.5259, decDeg: -5.571, mag:2.87, con:'aqr' },
    { id:'sadalmelik',name:'Sadalmelik',raH:22.0964, decDeg: -0.320, mag:2.95, con:'aqr' },
    { id:'sadachbia', name:'Sadachbia', raH:22.3612, decDeg: -1.387, mag:3.84, con:'aqr' },
    { id:'skat',      name:'Skat',      raH:22.9109, decDeg:-15.821, mag:3.27, con:'aqr' },
    { id:'lambdaaqr', name:'Lambda Aqr',raH:22.8767, decDeg: -7.580, mag:3.73, con:'aqr' },

    { id:'rigilkent', name:'Rigil Kentaurus', raH:14.6600, decDeg:-60.834, mag:-0.27, con:'cen' },
    { id:'hadar',     name:'Hadar',           raH:14.0637, decDeg:-60.373, mag:0.61, con:'cen' },
    { id:'menkent',   name:'Menkent',         raH:14.1114, decDeg:-36.370, mag:2.06, con:'cen' },

    { id:'polaris',    name:'Polaris',    raH:2.5303,  decDeg: 89.264, mag:1.98, con:'umi' },
    { id:'kochab',     name:'Kochab',     raH:14.8451, decDeg: 74.155, mag:2.07, con:'umi' },
    { id:'pherkad',    name:'Pherkad',    raH:15.3454, decDeg: 71.834, mag:3.05, con:'umi' },
    { id:'yildun',     name:'Yildun',     raH:17.5368, decDeg: 86.586, mag:4.35, con:'umi' },
    { id:'epsilonumi', name:'Epsilon UMi',raH:16.7660, decDeg: 82.037, mag:4.23, con:'umi' },
    { id:'zetaumi',    name:'Zeta UMi',   raH:15.7342, decDeg: 77.794, mag:4.32, con:'umi' },

    { id:'alderamin', name:'Alderamin', raH:21.3097, decDeg: 62.585, mag:2.44, con:'cep' },
    { id:'errai',     name:'Errai',     raH:23.6567, decDeg: 77.632, mag:3.21, con:'cep' },
    { id:'alfirk',    name:'Alfirk',    raH:21.4692, decDeg: 70.561, mag:3.23, con:'cep' },
    { id:'zetacep',   name:'Zeta Cep',  raH:22.1810, decDeg: 58.202, mag:3.35, con:'cep' },
    { id:'etacep',    name:'Eta Cep',   raH:20.7444, decDeg: 61.838, mag:3.43, con:'cep' },

    { id:'alphecca',   name:'Alphecca',   raH:15.5782, decDeg: 26.715, mag:2.23, con:'crb' },
    { id:'nusakan',    name:'Nusakan',    raH:15.4602, decDeg: 29.106, mag:3.68, con:'crb' },
    { id:'gammacrb',   name:'Gamma CrB',  raH:15.7275, decDeg: 26.295, mag:3.84, con:'crb' },
    { id:'epsiloncrb', name:'Epsilon CrB',raH:15.8283, decDeg: 26.878, mag:4.15, con:'crb' },
    { id:'thetacrb',   name:'Theta CrB',  raH:15.9678, decDeg: 31.360, mag:4.14, con:'crb' },

    { id:'gienahcrv', name:'Gienah Corvi', raH:12.2634, decDeg:-17.542, mag:2.59, con:'crv' },
    { id:'kraz',      name:'Kraz',         raH:12.5658, decDeg:-23.397, mag:2.65, con:'crv' },
    { id:'algorab',   name:'Algorab',      raH:12.6961, decDeg:-16.515, mag:2.94, con:'crv' },
    { id:'alchiba',   name:'Alchiba',      raH:12.1372, decDeg:-24.729, mag:4.02, con:'crv' },
    { id:'minkarcrv', name:'Minkar',       raH:12.1596, decDeg:-22.620, mag:3.00, con:'crv' },

    { id:'acubens',           name:'Acubens',           raH:8.9791, decDeg: 11.858, mag:4.25, con:'cnc' },
    { id:'altarf',            name:'Altarf',            raH:8.2751, decDeg:  9.186, mag:3.52, con:'cnc' },
    { id:'asellusaustralis',  name:'Asellus Australis', raH:8.7448, decDeg: 18.154, mag:3.94, con:'cnc' },
    { id:'asellusborealis',   name:'Asellus Borealis',  raH:8.7275, decDeg: 21.469, mag:4.66, con:'cnc' },

    { id:'rasalhague', name:'Rasalhague', raH:17.5822, decDeg: 12.560, mag:2.08, con:'oph' },
    { id:'cebalrai',   name:'Cebalrai',   raH:17.7233, decDeg:  4.567, mag:2.76, con:'oph' },
    { id:'sabik',      name:'Sabik',      raH:17.1728, decDeg:-15.725, mag:2.43, con:'oph' },
    { id:'yedprior',   name:'Yed Prior',  raH:16.2367, decDeg: -3.694, mag:2.74, con:'oph' },
    { id:'yedposterior',name:'Yed Posterior',raH:16.3180, decDeg:-4.693, mag:3.24, con:'oph' },
    { id:'zetaoph',    name:'Zeta Oph',   raH:16.6116, decDeg:-10.567, mag:2.56, con:'oph' },

    { id:'sualocin', name:'Sualocin', raH:20.6612, decDeg: 15.912, mag:3.77, con:'del' },
    { id:'rotanev',  name:'Rotanev',  raH:20.6255, decDeg: 14.595, mag:3.63, con:'del' },
    { id:'gammadel', name:'Gamma Del',raH:20.7024, decDeg: 16.126, mag:4.27, con:'del' },
    { id:'deltadel', name:'Delta Del',raH:20.7328, decDeg: 15.075, mag:4.43, con:'del' },

    { id:'miaplacidus', name:'Miaplacidus', raH:9.2200, decDeg:-69.717, mag:1.68, con:'car' },
    { id:'avior',       name:'Avior',       raH:8.3752, decDeg:-59.510, mag:1.86, con:'car' },
    { id:'aspidiske',   name:'Aspidiske',   raH:9.2851, decDeg:-59.275, mag:2.21, con:'car' },

    { id:'regor',     name:'Regor',   raH:8.1590, decDeg:-47.337, mag:1.75, con:'vel' },
    { id:'alsephina', name:'Alsephina',raH:8.7454, decDeg:-54.709, mag:1.96, con:'vel' },
    { id:'markeb',    name:'Markeb',  raH:9.3671, decDeg:-55.011, mag:2.47, con:'vel' },
    { id:'suhail',    name:'Suhail',  raH:9.1330, decDeg:-43.433, mag:2.21, con:'vel' },

    { id:'achernar', name:'Achernar', raH:1.6286,  decDeg:-57.237, mag:0.46, con:null },
    { id:'canopus',  name:'Canopus',  raH:6.3992,  decDeg:-52.696, mag:-0.74, con:'car' },
    { id:'fomalhaut',name:'Fomalhaut',raH:22.9608, decDeg:-29.622, mag:1.16, con:null }
  ];

  const CONSTELLATIONS = {
    uma: { name:'Ursa Major', nameId:'Biduk (Ursa Major)', line:['alkaid','mizar','alioth','megrez','phecda','merak','dubhe','megrez'] },
    ori: { name:'Orion', nameId:'Orion', line:['betelgeuse','alnitak','alnilam','mintaka','rigel'], extra:[['bellatrix','mintaka'],['betelgeuse','bellatrix'],['rigel','saiph'],['saiph','alnitak']] },
    cru: { name:'Crux', nameId:'Salib Selatan (Crux)', line:['acrux','gacrux'], extra:[['mimosa','imai']] },
    sco: { name:'Scorpius', nameId:'Kalajengking (Scorpius)', line:['graffias','dschubba','pisco','antares','tausco','epssco','shaula','lesath'], extra:[['shaula','kappasco']] },
    cas: { name:'Cassiopeia', nameId:'Cassiopeia', line:['caph','schedar','navi','ruchbah','segin'] },
    leo: { name:'Leo', nameId:'Leo (Singa)', line:['denebola','zosma','chertan','regulus','algieba','adhafera','epsleo','algieba'] },
    cma: { name:'Canis Major', nameId:'Canis Major', line:['mirzam','sirius','adhara','wezen','aludra'] },
    cyg: { name:'Cygnus', nameId:'Salib Utara (Cygnus)', line:['deltacyg','sadr','gienah'], extra:[['deneb','sadr'],['sadr','albireo']] },
    tau: { name:'Taurus', nameId:'Taurus (Banteng)', line:['zetatau','elnath','aldebaran'], extra:[] },
    gem: { name:'Gemini', nameId:'Gemini (Si Kembar)', line:['castor','wasat','alhena'], extra:[['pollux','wasat'],['castor','pollux']] },

    sgr: { name:'Sagittarius', nameId:'Pemanah (Sagittarius)', line:['kausborealis','kausmedia','kausaustralis','alnasl','kausmedia','phisgr','nunki','ascella'] },
    aql: { name:'Aquila', nameId:'Elang (Aquila)', line:['tarazed','altair','alshain'], extra:[['altair','deltaaql'],['deltaaql','okab'],['tarazed','denebelokab']] },
    lyr: { name:'Lyra', nameId:'Lira (Lyra)', line:['vega','zeta1lyr','delta2lyr','sulafat','sheliak','zeta1lyr'] },
    boo: { name:'Boötes', nameId:'Boötes (Penggembala)', line:['nekkar','seginus','arcturus','muphrid'], extra:[['arcturus','izar'],['izar','deltaboo'],['deltaboo','nekkar']] },
    vir: { name:'Virgo', nameId:'Virgo (Perawan)', line:['zavijava','porrima','auva','vindemiatrix'], extra:[['porrima','heze'],['heze','spica']] },
    lib: { name:'Libra', nameId:'Timbangan (Libra)', line:['zubenelgenubi','zubeneschamali','zubenelakrab','brachium','zubenelgenubi'] },
    peg: { name:'Pegasus', nameId:'Kuda Terbang (Pegasus)', line:['algenib','alpheratz','scheat','markab','algenib'], extra:[['markab','homam'],['homam','matar'],['markab','enif']] },
    and: { name:'Andromeda', nameId:'Andromeda', line:['alpheratz','deltaand','mirach','almach'] },
    per: { name:'Perseus', nameId:'Perseus', line:['algol','mirfak','gammaper','miram'], extra:[['mirfak','deltaper'],['deltaper','epsilonper']] },
    aur: { name:'Auriga', nameId:'Sais (Auriga)', line:['capella','hassaleh','elnath','mahasim','menkalinan','capella'] },
    cmi: { name:'Canis Minor', nameId:'Anjing Kecil (Canis Minor)', line:['procyon','gomeisa'] },
    ari: { name:'Aries', nameId:'Domba Jantan (Aries)', line:['hamal','sheratan','mesarthim'] },
    cap: { name:'Capricornus', nameId:'Kambing Laut (Capricornus)', line:['algedi','dabih','zetacap','nashira','denebalgedi'] },
    aqr: { name:'Aquarius', nameId:'Pembawa Air (Aquarius)', line:['sadalsuud','sadalmelik','sadachbia'], extra:[['sadalmelik','lambdaaqr'],['lambdaaqr','skat']] },
    cen: { name:'Centaurus', nameId:'Centaurus', line:['hadar','rigilkent'], extra:[] },

    umi: { name:'Ursa Minor', nameId:'Biduk Kecil (Ursa Minor)', line:['polaris','yildun','epsilonumi','zetaumi','kochab','pherkad'], extra:[['zetaumi','pherkad']] },
    cep: { name:'Cepheus', nameId:'Cepheus', line:['alfirk','alderamin','etacep','zetacep','errai','alfirk'] },
    crb: { name:'Corona Borealis', nameId:'Mahkota Utara (Corona Borealis)', line:['nusakan','alphecca','gammacrb','epsiloncrb','thetacrb'] },
    crv: { name:'Corvus', nameId:'Burung Gagak (Corvus)', line:['alchiba','minkarcrv','kraz','gienahcrv','algorab','minkarcrv'] },
    cnc: { name:'Cancer', nameId:'Kepiting (Cancer)', line:['altarf','acubens','asellusaustralis','asellusborealis'] },
    oph: { name:'Ophiuchus', nameId:'Pemegang Ular (Ophiuchus)', line:['yedprior','yedposterior','rasalhague','cebalrai','sabik','zetaoph','yedposterior'] },
    del: { name:'Delphinus', nameId:'Lumba-lumba (Delphinus)', line:['rotanev','sualocin','gammadel','deltadel','rotanev'] },
    car: { name:'Carina', nameId:'Lunas Kapal (Carina)', line:['avior','aspidiske','canopus'], extra:[['aspidiske','miaplacidus']] },
    vel: { name:'Vela', nameId:'Layar Kapal (Vela)', line:['regor','suhail','markeb','alsephina','regor'] }
  };

  const byId = {};
  STAR_CATALOG.forEach(s=>{ byId[s.id] = s; });

  function starById(id){ return byId[id]; }

  global.ISSStars = { STAR_CATALOG, CONSTELLATIONS, starById };

})(window);
