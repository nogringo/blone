cd blone_dashboard
flutter build web --base-href /dashboard/

rm -rf ../public
mkdir ../public
cp -r build/web/* ../public/