import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChooseRol(){
    const router = useRouter();

    return(
        <View style={{flex:1, flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
            
            {/* 1. Navegar a la Home del Pasajero */}
            <TouchableOpacity onPress={()=>{router.push('/pages/Pasajero/Navigation')}}>
                <View style={{width:150, height:300, backgroundColor:'blue', padding:'5%', marginRight:15, justifyContent:'center', alignItems:'center', elevation:12, borderRadius:15}}>
                    <Text style={{color:'white'}}>Pasajero</Text>
                </View>
            </TouchableOpacity>

            {/* 2. Navegar a la Home del Conductor */}
            <TouchableOpacity onPress={()=>{router.push('/pages/Conductor/Home')}}>
                <View style={{width:150, height:300, backgroundColor:'#ff1919ff', padding:'5%', justifyContent:'center', alignItems:'center', elevation:12, borderRadius:15 }}>
                    <Text style={{color:'white'}}>Conductor</Text>
                </View>
            </TouchableOpacity>
        </View>
    )
}